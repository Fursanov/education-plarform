import { useState, useEffect } from 'react';
import { getAllUsers, updateUser } from '../services/firestore';

function Admin({ user }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            const usersList = await getAllUsers();
            setUsers(usersList);
            setLoading(false);
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
            console.error("Error updating user role:", err);
        }
    };

    if (loading) return <div>Загрузка...</div>;

    return (
        <div className="admin-page">
            <h1>Панель администратора</h1>

            <div className="users-list">
                <h2>Пользователи системы</h2>
                <table>
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
                        <tr key={userItem.id}>
                            <td>{userItem.name}</td>
                            <td>{userItem.email}</td>
                            <td>{userItem.role}</td>
                            <td>
                                {userItem.id !== user.uid && (
                                    <select
                                        value={userItem.role}
                                        onChange={(e) => handleRoleChange(userItem.id, e.target.value)}
                                    >
                                        <option value="student">Обучающийся</option>
                                        <option value="teacher">Преподаватель</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                )}
                            </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default Admin;