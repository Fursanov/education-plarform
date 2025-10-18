import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateAuthProfile } from '../services/auth';
import { updateUser, getUser, getFriends, getUsersByIds, searchUsersByNameOrTag } from '../services/firestore';
import './Profile.css';

function Profile({ user }) {
    const navigate = useNavigate();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [formData, setFormData] = useState({
                                                 name: '',
                                                 bio: '',
                                                 phone: '',
                                                 tag: '',
                                                 avatar: null
                                             });
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [friends, setFriends] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await getUser(user.uid);
                setUserData(data);
                setFormData({
                                name: data.name || '',
                                bio: data.bio || '',
                                phone: data.phone || '',
                                tag: data.tag || '',
                                avatar: data.avatar || null
                            });
                if (data.avatar) {
                    setAvatarPreview(data.avatar);
                }
                const friendIds = await getFriends(user.uid);
                if (friendIds?.length) {
                    const friendsData = await getUsersByIds(friendIds);
                    setFriends(friendsData);
                }
            } catch (err) {
                console.error("Ошибка загрузки данных:", err);
                setError("Не удалось загрузить данные профиля");
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [user]);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchQuery(query);

        if (query.trim().length === 0) {
            setSearchResults([]);
            return;
        }

        try {
            const results = await searchUsersByNameOrTag(query);
            setSearchResults(results);
        } catch (err) {
            console.error('Ошибка поиска:', err);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 0.5 * 1024 * 1024) {
            setError("Файл слишком большой. Максимальный размер: 0.5MB");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64String = reader.result;
            setAvatarPreview(base64String);
            setFormData(prev => ({
                ...prev,
                avatar: base64String
            }));
        };
        reader.readAsDataURL(file);
    };

    const handleFriendClick = (friendId) => {
        navigate(`/profile/${friendId}`);
    };

    const handleAddFriend = async (userId) => {
        console.log(`Добавление пользователя ${userId} в друзья`);
    };

    const generateUniqueTag = () => {
        const randomTag = Math.random().toString(36).substring(2, 8);
        setFormData(prev => ({
            ...prev,
            tag: randomTag
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        try {
            await updateUser(user.uid, {
                name: formData.name,
                bio: formData.bio,
                phone: formData.phone,
                tag: formData.tag,
                avatar: formData.avatar
            });

            setSuccess("Профиль успешно обновлен!");
            setEditing(false);

            setUserData({
                            ...userData,
                            ...formData
                        });
        } catch (err) {
            console.error("Ошибка обновления:", err);
            setError(err.message || "Ошибка при обновлении профиля");
        }
    };

    if (loading) return <div className="loading">Загрузка профиля...</div>;

    return (
        <div className="profile-page">
            <div className="profile-container">
                <div className="profile-header">
                    <h1>Мой профиль</h1>
                    {!editing && (
                        <button
                            onClick={() => setEditing(true)}
                            className="btn edit-btn"
                        >
                            Редактировать
                        </button>
                    )}
                </div>

                {error && <div className="alert error">{error}</div>}
                {success && <div className="alert success">{success}</div>}

                {editing ? (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group avatar-group">
                            <div className="avatar-preview">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Аватар" />
                                ) : (
                                    <div className="avatar-placeholder">
                                        {userData.name?.charAt(0) || 'U'}
                                    </div>
                                )}
                            </div>
                            <label className="avatar-upload">
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={handleAvatarChange}
                                />
                                Выбрать фото
                            </label>
                            <small>Макс. размер: 0.5MB</small>
                        </div>

                        <div className="form-group">
                            <label>Имя</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Уникальный тег</label>
                            <div className="tag-input">
                                <input
                                    type="text"
                                    name="tag"
                                    value={formData.tag}
                                    onChange={handleInputChange}
                                    pattern="[a-zA-Z0-9]{4,12}"
                                    title="Только буквы и цифры (4-12 символов)"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={generateUniqueTag}
                                    className="btn generate-tag-btn"
                                >
                                    Сгенерировать
                                </button>
                            </div>
                            <small>Используется для идентификации в системе</small>
                        </div>

                        <div className="form-group">
                            <label>Телефон</label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                pattern="\+?[0-9\s\-\(\)]{7,}"
                            />
                        </div>

                        <div className="form-group">
                            <label>О себе</label>
                            <textarea
                                name="bio"
                                value={formData.bio}
                                onChange={handleInputChange}
                                rows="4"
                                maxLength="500"
                            />
                            <small>{formData.bio.length}/500 символов</small>
                        </div>

                        <div className="form-actions">
                            <button
                                type="button"
                                onClick={() => {
                                    setEditing(false);
                                    setError(null);
                                    setAvatarPreview(userData.avatar || null);
                                }}
                                className="btn cancel-btn"
                            >
                                Отмена
                            </button>
                            <button
                                type="submit"
                                className="btn save-btn"
                            >
                                Сохранить
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="profile-content">
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
                                <h2>{userData.name}</h2>
                                <div className="profile-tag">@{userData.tag || 'notag'}</div>

                                <div className="profile-details">
                                    <div className="detail-item">
                                        <span className="detail-label">Email:</span>
                                        <span>{user.email}</span>
                                    </div>

                                    {userData.phone && (
                                        <div className="detail-item">
                                            <span className="detail-label">Телефон:</span>
                                            <span>{userData.phone}</span>
                                        </div>
                                    )}

                                    {userData.bio && (
                                        <div className="detail-item">
                                            <span className="detail-label">О себе:</span>
                                            <p>{userData.bio}</p>
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
                                </div>
                            </div>
                        </div>
                        <div className="friends-section">
                            <h3>Мои друзья ({friends.length})</h3>

                            {friends.length > 0 ? (
                                <div className="friends-grid">
                                    {friends.map(friend => (
                                        <div
                                            key={friend.id}
                                            className="friend-card"
                                            onClick={() => handleFriendClick(friend.id)}
                                        >
                                            <div className="friend-avatar">
                                                {friend.avatar ? (
                                                    <img src={friend.avatar} alt={friend.name} />
                                                ) : (
                                                    <div className="avatar-letter">
                                                        {friend.name?.charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="friend-info">
                                                <span className="friend-name">{friend.name}</span>
                                                <span className="friend-tag">@{friend.tag || 'notag'}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="no-friends">
                                    <p>У вас пока нет друзей.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Profile;