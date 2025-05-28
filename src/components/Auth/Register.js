import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { register } from '../../services/auth';
import { addUser } from '../../services/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './Register.css';

function useQuery() {
    return new URLSearchParams(useLocation().search);
}

function Register() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [role, setRole] = useState('student'); // роль подтянется из приглашения
    const [inviteId, setInviteId] = useState(null);
    const [error, setError] = useState('');
    const [loadingInvite, setLoadingInvite] = useState(true); // статус загрузки приглашения
    const navigate = useNavigate();
    const query = useQuery();

    useEffect(() => {
        const idFromUrl = query.get('token');
        if (!idFromUrl) {
            setError('Регистрация доступна только по приглашению.');
            setLoadingInvite(false);
            return;
        }
        setInviteId(idFromUrl);
        fetchInvite(idFromUrl);
    }, []);

    const fetchInvite = async (id) => {
        try {
            const docRef = doc(db, 'qrInvites', id);
            const snap = await getDoc(docRef);

            if (!snap.exists()) {
                setError('Недействительное приглашение.');
                setLoadingInvite(false);
                return;
            }

            const data = snap.data();

            if (data.used) {
                setError('Этот код уже использован.');
                setLoadingInvite(false);
                return;
            }

            if (data.expiresAt.toDate() < new Date()) {
                setError('Срок действия кода истёк.');
                setLoadingInvite(false);
                return;
            }

            setRole(data.role || 'student');
            setLoadingInvite(false);
        } catch (err) {
            console.error(err);
            setError('Ошибка при обработке кода приглашения.');
            setLoadingInvite(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await register(email, password);
            await addUser(userCredential.user.uid, email, role, name);

            if (inviteId) {
                await updateDoc(doc(db, 'qrInvites', inviteId), {
                    used: true,
                });
            }

            navigate('/');
        } catch (err) {
            setError(err.message);
        }
    };

    if (loadingInvite) {
        return <div>Проверка приглашения...</div>;
    }

    if (error) {
        return <div className="error">{error}</div>;
    }

    return (
        <div className="auth-container">
            <h2>Регистрация по приглашению</h2>
            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Имя"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                {/* Роль берётся из приглашения, пользователь её не выбирает */}
                <p>Ваша роль: <b>{role}</b></p>

                <button type="submit">Зарегистрироваться</button>
            </form>
            <p>
                Уже есть аккаунт? <a href="/login">Войти</a>
            </p>
        </div>
    );
}

export default Register;
