import { auth } from "./firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";

export const register = (email, password) => {
    return createUserWithEmailAndPassword(auth, email, password);
};

export const login = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

export const updateAuthProfile = async (data) => {
    const user = auth.currentUser; // Получаем текущего пользователя
    if (!user) throw new Error("Пользователь не авторизован");

    await updateProfile(user, {
        displayName: data.displayName,
        photoURL: data.photoURL
    });
};

export const logout = () => {
    return signOut(auth);
};

export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};