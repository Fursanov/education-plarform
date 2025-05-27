import { db } from "./firebase";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    getDoc,
    setDoc,
    updateDoc,
    query,
    where,
    getDocs,
    onSnapshot,
    serverTimestamp,
    orderBy
} from "firebase/firestore";

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

export { db }; // Добавляем экспорт db