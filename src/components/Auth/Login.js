import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../../services/auth';
import { getUserById, updateLastLogin } from '../../services/firestore';
import './Login.css';

function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const userCredential = await login(email, password);
            const uid = userCredential.user.uid;

            const userData = await getUserById(uid);
            if (!userData) {
                throw new Error("Пользователь не найден в базе данных");
            }

            // Обновляем поле lastLoginAt
            await updateLastLogin(uid);

            switch (userData.role) {
                case 'admin':
                    navigate('/admin');
                    break;
                case 'teacher':
                    navigate('/');
                    break;
                default:
                    navigate('/');
                    break;
            }
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="auth-container">
            <h2>Вход в систему</h2>
            {error && <p className="error">{error}</p>}
            <form onSubmit={handleSubmit}>
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
                <button type="submit">Войти</button>
            </form>
        </div>
    );
}

export default Login;