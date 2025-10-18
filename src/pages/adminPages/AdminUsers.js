import { useState, useEffect } from 'react';
import { getAllUsers, updateUser } from '../../services/firestore';
import { useNavigate } from 'react-router-dom';
import RegistrationQR from './RegistrationQR';
import './AdminUsers.css';
import LoadingSpinner from "../../components/UI/LoadingSpinner";

function AdminUsers({ user }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [qrPanelOpen, setQrPanelOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const navigate = useNavigate();

    useEffect(() => {
        fetchUsers();
    }, []);

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

    const navigateToProfile = (userId) => {
        if (userId !== user.uid) {
            navigate(`/profile/${userId}`);
        }
    };

    const filteredUsers = users.filter(userItem => {
        const matchesSearch = userItem.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            userItem.email?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterRole === 'all') return matchesSearch;
        return matchesSearch && userItem.role === filterRole;
    });

    const getRoleStats = () => {
        return {
            total: users.length,
            students: users.filter(u => u.role === 'student').length,
            teachers: users.filter(u => u.role === 'teacher').length,
            admins: users.filter(u => u.role === 'admin').length
        };
    };

    const stats = getRoleStats();

    if (loading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка пользователей...</p>
            </div>
        );
    }

    return (
        <div className="admin-users-page">
            <div className="admin-users-page__header">
                <h1>Управление пользователями</h1>
                <div className="admin-users-page__stats">
                    <div className="admin-users-page__stat-card">
                        <h3>Всего пользователей</h3>
                        <span className="admin-users-page__stat-number">{stats.total}</span>
                    </div>
                    <div className="admin-users-page__stat-card">
                        <h3>Слушателей</h3>
                        <span className="admin-users-page__stat-number admin-users-page__stat-number--student">
                            {stats.students}
                        </span>
                    </div>
                    <div className="admin-users-page__stat-card">
                        <h3>Преподавателей</h3>
                        <span className="admin-users-page__stat-number admin-users-page__stat-number--teacher">
                            {stats.teachers}
                        </span>
                    </div>
                    <div className="admin-users-page__stat-card">
                        <h3>Менеджеров</h3>
                        <span className="admin-users-page__stat-number admin-users-page__stat-number--admin">
                            {stats.admins}
                        </span>
                    </div>
                </div>
            </div>

            <div className="admin-users-page__controls">
                <div className="admin-users-page__search-filter-container">
                    <input
                        type="text"
                        placeholder="Поиск по имени или email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-users-page__search-input"
                    />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="admin-users-page__filter-select"
                    >
                        <option value="all">Все роли</option>
                        <option value="student">Слушатели</option>
                        <option value="teacher">Преподаватели</option>
                        <option value="admin">Менеджеры</option>
                    </select>
                    <button
                        className="admin-users-page__qr-toggle-button"
                        onClick={() => setQrPanelOpen(!qrPanelOpen)}
                        aria-expanded={qrPanelOpen}
                    >
                        {qrPanelOpen ? 'Скрыть QR генератор' : 'Показать QR генератор'}
                    </button>
                </div>
            </div>

            {/* Слайд-аут панель с QR */}
            <div className={`admin-users-page__qr-slide-panel ${qrPanelOpen ? 'admin-users-page__qr-slide-panel--open' : ''}`}>
                {user && <RegistrationQR user={user} />}
            </div>

            <div className="admin-users-page__table-container">
                <table className="admin-users-page__table">
                    <thead>
                    <tr>
                        <th>Имя</th>
                        <th>Email</th>
                        <th>Роль</th>
                        <th>Дата регистрации</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredUsers.length === 0 ? (
                        <tr>
                            <td colSpan="5" className="admin-users-page__no-users">
                                Пользователи не найдены
                            </td>
                        </tr>
                    ) : (
                        filteredUsers.map((userItem) => (
                            <tr
                                key={userItem.id}
                                className={userItem.id === user.uid ? 'current-user' : ''}
                                onClick={() => navigateToProfile(userItem.id)}
                            >
                                <td>
                                    <div className="admin-users-page__user-info">
                                        <span className="admin-users-page__user-name">{userItem.name}</span>
                                        {userItem.id === user.uid && (
                                            <span className="admin-users-page__you-badge">Вы</span>
                                        )}
                                    </div>
                                </td>
                                <td>{userItem.email}</td>
                                <td>
                                        <span className={`admin-users-page__role-badge admin-users-page__role-badge--${userItem.role}`}>
                                            {userItem.role === 'student' && 'Слушатель'}
                                            {userItem.role === 'teacher' && 'Преподаватель'}
                                            {userItem.role === 'admin' && 'Менеджер'}
                                        </span>
                                </td>
                                <td>
                                    {userItem.createdAt ?
                                        new Date(userItem.createdAt.seconds * 1000).toLocaleDateString('ru-RU') :
                                        'Не указана'
                                    }
                                </td>
                                <td onClick={(e) => e.stopPropagation()}>
                                    {userItem.id !== user.uid ? (
                                        <select
                                            value={userItem.role}
                                            onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                                            className="admin-users-page__role-select"
                                        >
                                            <option value="student">Слушатель</option>
                                            <option value="teacher">Преподаватель</option>
                                            <option value="admin">Менеджер</option>
                                        </select>
                                    ) : (
                                        <span className="admin-users-page__current-user-text">текущий пользователь</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminUsers;