import { useState, useEffect } from 'react';
import { getAllUsers, updateUser } from '../services/firestore';
import RegistrationQR from './RegistrationQR';
import './Admin.css';
import {logout} from "../services/auth";
import {useNavigate} from "react-router-dom";

function Admin({ user }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrPanelOpen, setQrPanelOpen] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const usersList = await getAllUsers();
                setUsers(usersList);
            } catch (error) {
                console.error("Ошибка при загрузке пользователей:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchUsers();
    }, []);

    const handleRoleChange = async (userId, newRole) => {
        try {
            await updateUser(userId, { role: newRole });
            setUsers(users.map(user =>
                user.id === userId ? { ...user, role: newRole } : user
            ));
        } catch (err) {
            console.error("Ошибка при обновлении роли пользователя:", err);
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/login";
        } catch (error) {
            console.error("Ошибка выхода:", error);
        }
    };

    const navigateToProfile = (userId) => {
        if (userId !== user.uid) {
            navigate(`/profile/${userId}`);
        }
    };

    if (loading) return <div className="admin-page">Загрузка...</div>;

    return (
        <div className="admin-page">
            <h1>Панель администратора</h1>

            <div style={{ marginBottom: '20px', display: "flex", justifyContent: "space-between" }}>
                <button
                    className="qr-toggle-button"
                    onClick={() => setQrPanelOpen(!qrPanelOpen)}
                    aria-expanded={qrPanelOpen}
                >
                    {qrPanelOpen ? 'Закрыть генератор QR' : 'Открыть генератор QR'}
                </button>
                <button onClick={handleLogout} className="btn logout-btn">Выйти</button>
            </div>

            {/* Слайд-аут панель с QR */}
            <div className={`qr-slide-panel ${qrPanelOpen ? 'open' : ''}`}>
                {user && <RegistrationQR user={user} />}
            </div>

            <div className="users-list">
                <h2>Пользователи системы</h2>
                <div className="table-wrapper">
                    <table className="admin-table">
                        <thead>
                        <tr>
                            <th>Имя</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {users.map((userItem) => (
                            <tr key={userItem.id} onClick={() => navigateToProfile(userItem.id)}>
                                <td>{userItem.name}</td>
                                <td>{userItem.email}</td>
                                <td>{userItem.role}</td>
                                <td style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                    {user && userItem.id !== user.uid && (
                                        <select
                                            className="admin-search-input"
                                            value={userItem.role}
                                            onChange={(e) =>
                                                handleRoleChange(userItem.id, e.target.value)
                                            }
                                        >
                                            <option value="student">Обучающийся</option>
                                            <option value="teacher">Преподаватель</option>
                                            <option value="admin">Администратор</option>
                                        </select>
                                    )}
                                    {user && userItem.id === user.uid && (
                                        <span style={{width: '100%'}}>вы</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default Admin;
