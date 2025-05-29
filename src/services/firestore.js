import {db} from "./firebase";
import {
    addDoc,
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    limit,
    startAt,
    endAt
} from "firebase/firestore";

export const getUserById = async (uid) => {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};


// Добавление пользователя
export const addUser = async (uid, email, role, name) => {
    await setDoc(doc(db, "users", uid), {
        email,
        role,
        name,
        courses: []
    });
};

export const checkIfFriend = async (uid, friendId) => {
    const docRef = doc(db, `friends/${uid}/list`, friendId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists();
};

export const addFriend = async (uid, friendId) => {
    const docRef = doc(db, `friends/${uid}/list`, friendId);
    await setDoc(docRef, {
        addedAt: new Date().toISOString()
    });
};

export const getFriends = async (uid) => {
    const friendsRef = collection(db, `friends/${uid}/list`);
    const snapshot = await getDocs(friendsRef);

    const friendIds = [];
    snapshot.forEach(doc => {
        friendIds.push(doc.id); // friendId — это id документа
    });

    return friendIds;
};

export const getUsersByIds = async (ids) => {
    if (!ids || ids.length === 0) return [];

    const chunkSize = 10; // Firestore поддерживает только 10 элементов в `in`
    const users = [];

    for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const q = query(
            collection(db, 'users'),
            where('__name__', 'in', chunk)
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(doc => {
            users.push({ id: doc.id, ...doc.data() });
        });
    }

    return users;
};


export const searchUsersByNameOrTag = async (searchTerm) => {
    const usersRef = collection(db, 'users');
    const term = searchTerm.toLowerCase();
    const searchLimit = 10;

    const nameQuery = query(
        usersRef,
        orderBy('name'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(searchLimit)
    );

    const tagQuery = query(
        usersRef,
        orderBy('tag'),
        startAt(term),
        endAt(term + '\uf8ff'),
        limit(searchLimit)
    );

    const [nameSnap, tagSnap] = await Promise.all([getDocs(nameQuery), getDocs(tagQuery)]);

    const usersMap = new Map();

    nameSnap.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    tagSnap.forEach(doc => {
        usersMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    return Array.from(usersMap.values());
};


// Получение пользователя
export const getUser = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

// Получение всех пользователей
export const getAllUsers = async () => {
    const querySnapshot = await getDocs(collection(db, "users"));
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// Работа с чатом
export const getChatMessages = (courseId, callback) => {
    const q = query(
        collection(db, `courses/${courseId}/messages`),
        orderBy("timestamp")
    );
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        callback(messages);
    });
};

export const sendChatMessage = async (courseId, message) => {
    await addDoc(collection(db, "courses", courseId, "messages"), {
        ...message,
        timestamp: serverTimestamp()
    });
};

export const markMessagesAsRead = async (courseId, userId) => {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
        [`lastReadChatTimes.${courseId}`]: new Date()
    });
};

export const updateUser = async (userId, data) => {
    await setDoc(doc(db, 'users', userId), data, { merge: true });
};

export const getChatParticipants = async (courseId) => {
    try {
        // 1. Получаем данные о курсе
        const courseRef = doc(db, 'courses', courseId);
        const courseSnap = await getDoc(courseRef);

        if (!courseSnap.exists()) {
            console.log('Course not found');
            return [];
        }

        const courseData = courseSnap.data();

        // 2. Собираем всех участников: преподаватель + студенты
        const participantsIds = [
            courseData.teacherId, // добавляем преподавателя
            ...(courseData.students || []) // добавляем студентов
        ].filter(id => id); // убираем возможные undefined/null

        // 3. Удаляем дубликаты (на случай если teacherId есть в students)
        const uniqueIds = [...new Set(participantsIds)];

        // 4. Получаем данные каждого пользователя
        const participants = await Promise.all(
            uniqueIds.map(async (userId) => {
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);

                if (!userSnap.exists()) {
                    return null;
                }

                const userData = userSnap.data();
                return {
                    id: userId,
                    name: userData.name || 'Аноним',
                    email: userData.email || '',
                    role: userData.role || 'student',
                    avatar: userData.avatar || null
                };
            })
        );

        // 5. Фильтруем возможные null (если пользователь не найден)
        return participants.filter(p => p !== null);

    } catch (error) {
        console.error("Error in getChatParticipants:", error);
        return [];
    }
};

// Добавляем функцию для получения чатов пользователя
export const getUserChats = async (userId, isTeacher, isAdmin = false) => {
    try {
        const coursesRef = collection(db, 'courses');

        // Запрашиваем курсы, в которых пользователь — студент
        const studentQuery = query(coursesRef, where('students', 'array-contains', userId));
        const studentCoursesSnapshot = await getDocs(studentQuery);

        // Если преподаватель — добавляем также курсы по teacherId
        let allDocs = [...studentCoursesSnapshot.docs];

        if (isTeacher) {
            const teacherQuery = query(coursesRef, where('teacherId', '==', userId));
            const teacherCoursesSnapshot = await getDocs(teacherQuery);

            // Объединяем и удаляем дубликаты по course ID
            const courseMap = new Map();
            allDocs.forEach(doc => courseMap.set(doc.id, doc));
            teacherCoursesSnapshot.docs.forEach(doc => courseMap.set(doc.id, doc));
            allDocs = Array.from(courseMap.values());
        }

        // Сбор информации по каждому курсу
        const chats = await Promise.all(
            allDocs.map(async (courseDoc) => {
                const courseData = courseDoc.data();
                const courseId = courseDoc.id;

                // Последнее сообщение
                let lastMessage = '';
                try {
                    const messagesQuery = query(
                        collection(db, 'courses', courseId, 'messages'),
                        orderBy('timestamp', 'desc'),
                        limit(1)
                    );
                    const messagesSnapshot = await getDocs(messagesQuery);

                    if (!messagesSnapshot.empty) {
                        const lastMsgData = messagesSnapshot.docs[0].data();
                        lastMessage = lastMsgData.text || '';

                        if (lastMsgData.fileType) {
                            lastMessage = lastMsgData.fileType === 'image'
                                ? '📷 Изображение'
                                : '📁 Файл';
                        }
                    }
                } catch (e) {
                    console.error(`Error loading messages for ${courseId}:`, e);
                }

                // Имя преподавателя
                let teacherName = 'Преподаватель';
                try {
                    if (courseData.teacherId) {
                        const teacherDoc = await getDoc(doc(db, 'users', courseData.teacherId));
                        if (teacherDoc.exists()) {
                            teacherName = teacherDoc.data().name || teacherName;
                        }
                    }
                } catch (e) {
                    console.error(`Error loading teacher for ${courseId}:`, e);
                }

                return {
                    id: courseId,
                    name: courseData.title || 'Без названия',
                    description: courseData.description || '',
                    lastMessage,
                    teacher: teacherName,
                    unreadCount: 0,
                    createdAt: courseData.createdAt?.toDate?.() || new Date()
                };
            })
        );

        // Сортировка по дате создания
        return chats.sort((a, b) => b.createdAt - a.createdAt);

    } catch (error) {
        console.error("Error in getUserChats:", error);
        return [];
    }
};