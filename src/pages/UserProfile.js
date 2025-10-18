import { useState, useEffect } from 'react';
import { getUser, addFriend, checkIfFriend } from '../services/firestore';
import {Link, useParams} from 'react-router-dom';
import './Profile.css';
import './UserProfile.css';
import LoadingSpinner from "../components/UI/LoadingSpinner";

function UserProfile({ currentUser }) {
    const { userId } = useParams();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isFriend, setIsFriend] = useState(false);
    const [adding, setAdding] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getUser(userId);
                if (!data) throw new Error("Пользователь не найден");
                setUserData(data);

                if (currentUser && currentUser.uid !== userId) {
                    const alreadyFriend = await checkIfFriend(currentUser.uid, userId);
                    setIsFriend(alreadyFriend);
                }
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [userId, currentUser]);

    const handleAddFriend = async () => {
        if (!currentUser) return;
        setAdding(true);
        try {
            await addFriend(currentUser.uid, userId);
            await addFriend(userId, currentUser.uid);
            setIsFriend(true);
        } catch (err) {
            console.error("Ошибка добавления в друзья:", err);
            alert("Не удалось добавить в друзья.");
        } finally {
            setAdding(false);
        }
    };

    if (loading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка профиля...</p>
            </div>
        );
    }
    if (error) return <div className="error">{error}</div>;
    if (!userData) return <div>Пользователь не найден</div>;

    return (
        <div className="profile-container">
            <div className="profile-view">
                <div className="profile-avatar">
                    {userData.avatar ? (
                        <img src={userData.avatar} alt="Аватар" />
                    ) : (
                        <div className="avatar-placeholder">
                            {userData.name?.charAt(0) || 'U'}
                        </div>
                    )}
                </div>

                <div className="profile-info">
                    {currentUser && currentUser.uid !== userId && (
                        <div className="friend-action">
                            {isFriend && (
                                <Link
                                    to={`/chat/private/${userId}`}
                                    className="btn add-friend-btn"
                                >
                                    Написать сообщение
                                </Link>
                            )}
                            {isFriend ? (
                                <span className="friend-status">Уже в друзьях</span>
                            ) : (
                                <button
                                    onClick={handleAddFriend}
                                    className="btn add-friend-btn"
                                    disabled={adding}
                                >
                                    {adding ? "Добавление..." : "Добавить в друзья"}
                                </button>
                            )}
                        </div>
                    )}
                    <h2>{userData.name}</h2>
                    <div className="profile-tag">@{userData.tag || 'notag'}</div>

                    <div className="profile-details">
                        {userData.phone && (
                            <div className="detail-item">
                                <span className="detail-label">Мобильный номер:</span>
                                <p>{userData.phone}</p>
                            </div>
                        )}

                        {userData.email && (
                            <div className="detail-item">
                                <span className="detail-label">email:</span>
                                <p>{userData.email}</p>
                            </div>
                        )}
                        <div className="detail-item">
                            <span className="detail-label">Роль:</span>
                            <span className={`role-badge ${userData.role}`}>
                                {userData.role === 'student' && 'Слушатель'}
                                {userData.role === 'teacher' && 'Преподаватель'}
                                {userData.role === 'admin' && 'Менеджер'}
                            </span>
                        </div>

                        {userData.bio && (
                            <div className="detail-item">
                                <span className="detail-label">О себе:</span>
                                <p>{userData.bio}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;