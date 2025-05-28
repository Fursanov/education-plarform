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
    limit
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

// Получение пользователя
export const getUser = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
};

// Обновление пользователя (для админа)
export const updateUser = async (userId, data) => {
    await updateDoc(doc(db, "users", userId), data);
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