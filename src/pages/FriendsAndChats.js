import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    getFriends,
    getUsersByIds,
    searchUsersByNameOrTag,
    addFriend,
    getUserChats
} from '../services/firestore';
import './FriendsAndChats.css';
import LoadingSpinner from "../components/UI/LoadingSpinner";

function FriendsAndChats({ user, userData }) {
    const [friends, setFriends] = useState([]);
    const [chats, setChats] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('friends');
    const [loading, setLoading] = useState(true);
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Загружаем друзей
            const friendIds = await getFriends(user.uid);
            const friendsData = await getUsersByIds(friendIds);
            setFriends(friendsData);

            // Загружаем чаты
            const isTeacher = userData.role === 'teacher';
            const isAdmin = userData.role === 'admin';
            const userChats = await getUserChats(user.uid, isTeacher, isAdmin);
            setChats(userChats);

        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
        } finally {
            setLoading(false);
        }
    };

    // Функция для отображения аватара
    const renderAvatar = (userItem, className = 'friends-chats__user-avatar') => {
        if (userItem.avatar) {
            return (
                <img
                    src={userItem.avatar}
                    alt={userItem.name}
                    className={className}
                    onError={(e) => {
                        // Если изображение не загружается, показываем букву
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                    }}
                />
            );
        }

        return (
            <div className={className}>
                {userItem.name?.charAt(0) || userItem.email?.charAt(0)}
            </div>
        );
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            setSearchResults([]);
            return;
        }

        try {
            setSearching(true);
            const results = await searchUsersByNameOrTag(searchTerm);
            const filteredResults = results.filter(u => u.id !== user.uid);
            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Ошибка поиска:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleAddFriend = async (friendId) => {
        try {
            await addFriend(user.uid, friendId);
            const friendIds = await getFriends(user.uid);
            const friendsData = await getUsersByIds(friendIds);
            setFriends(friendsData);
            setSearchResults(prev => prev.filter(u => u.id !== friendId));
            alert('Пользователь добавлен в друзья!');
        } catch (error) {
            console.error('Ошибка добавления друга:', error);
            alert('Ошибка при добавлении в друзья');
        }
    };

    const startPrivateChat = (userId) => {
        navigate(`/chat/private/${userId}`);
    };

    const openCourseChat = (courseId) => {
        navigate(`/chat/${courseId}`);
    };

    const getStatus = (lastLoginAt) => {
        if (!lastLoginAt) return 'offline';
        const lastLoginTime = lastLoginAt?.toDate?.() || lastLoginAt;
        const diffHours = (new Date() - lastLoginTime) / (1000 * 60 * 60);
        return diffHours < 1 ? 'online' : diffHours < 24 ? 'recent' : 'offline';
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return '#10B981';
            case 'recent': return '#F59E0B';
            case 'offline': return '#6B7280';
            default: return '#6B7280';
        }
    };

    if (loading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="friends-chats">
            <div className="friends-chats__header">
                <h1 className="friends-chats__title">Друзья и чаты</h1>
            </div>

            <div className="friends-chats__tabs-container">
                <div className="friends-chats__tabs">
                    <button
                        className={`friends-chats__tab ${activeTab === 'friends' ? 'friends-chats__tab--active' : ''}`}
                        onClick={() => setActiveTab('friends')}
                    >
                        Друзья ({friends.length})
                    </button>
                    <button
                        className={`friends-chats__tab ${activeTab === 'chats' ? 'friends-chats__tab--active' : ''}`}
                        onClick={() => setActiveTab('chats')}
                    >
                        Чаты ({chats.length})
                    </button>
                </div>
            </div>

            {/* Поиск пользователей */}
            <div className="friends-chats__search-section">
                <div className="friends-chats__search-container">
                    <input
                        type="text"
                        placeholder="Поиск пользователей по имени или тегу..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        className="friends-chats__search-input"
                    />
                    <button
                        onClick={handleSearch}
                        className="friends-chats__search-button"
                        disabled={searching}
                    >
                        {searching ? 'Поиск...' : 'Найти'}
                    </button>
                </div>

                {searchResults.length > 0 && (
                    <div className="friends-chats__search-results">
                        <h3 className="friends-chats__search-results-title">Результаты поиска:</h3>
                        {searchResults.map(userItem => (
                            <div key={userItem.id} className="friends-chats__search-result-item">
                                <div className="friends-chats__user-info">
                                    {renderAvatar(userItem, 'friends-chats__user-avatar')}
                                    <div className="friends-chats__user-details">
                                        <span className="friends-chats__user-name">{userItem.name || 'Без имени'}</span>
                                        <span className="friends-chats__user-email">{userItem.email}</span>
                                        <span className="friends-chats__user-role">{userItem.role}</span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleAddFriend(userItem.id)}
                                    className="friends-chats__add-friend-button"
                                >
                                    Добавить в друзья
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Содержимое вкладок */}
            <div className="friends-chats__tab-content">
                {activeTab === 'friends' && (
                    <div className="friends-chats__friends-list">
                        <h2 className="friends-chats__tab-title">Мои друзья</h2>
                        {friends.length === 0 ? (
                            <div className="friends-chats__empty-state">
                                <p>У вас пока нет друзей</p>
                                <p>Используйте поиск выше, чтобы найти пользователей</p>
                            </div>
                        ) : (
                            <div className="friends-chats__friends-grid">
                                {friends.map(friend => (
                                    <div key={friend.id} className="friends-chats__friend-card">
                                        {renderAvatar(friend, 'friends-chats__friend-avatar')}
                                        <div className="friends-chats__friend-info">
                                            <span className="friends-chats__friend-name">{friend.name || 'Без имени'}</span>
                                            <span className="friends-chats__friend-email">{friend.email}</span>
                                            <span className="friends-chats__friend-role">{friend.role}</span>
                                            <div className="friends-chats__friend-status">
                                                <div
                                                    className="friends-chats__status-dot"
                                                    style={{
                                                        backgroundColor: getStatusColor(getStatus(friend.lastLoginAt))
                                                    }}
                                                ></div>
                                                <span>{getStatus(friend.lastLoginAt)}</span>
                                            </div>
                                        </div>
                                        <div className="friends-chats__friend-actions">
                                            <button
                                                onClick={() => startPrivateChat(friend.id)}
                                                className="friends-chats__chat-button"
                                            >
                                                💬 Чат
                                            </button>
                                            <button
                                                onClick={() => navigate(`/profile/${friend.id}`)}
                                                className="friends-chats__profile-button"
                                            >
                                                👁️ Профиль
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'chats' && (
                    <div className="friends-chats__chats-list">
                        <h2 className="friends-chats__tab-title">Мои чаты</h2>
                        {chats.length === 0 ? (
                            <div className="friends-chats__empty-state">
                                <p>У вас пока нет чатов</p>
                                <p>Присоединитесь к курсам, чтобы начать общение</p>
                            </div>
                        ) : (
                            <div className="friends-chats__chats-grid">
                                {chats.map(chat => (
                                    <div
                                        key={chat.id}
                                        className="friends-chats__chat-card"
                                        onClick={() => openCourseChat(chat.id)}
                                    >
                                        <div className="friends-chats__chat-avatar">
                                            {chat.name?.charAt(0) || 'C'}
                                        </div>
                                        <div className="friends-chats__chat-info">
                                            <span className="friends-chats__chat-name">{chat.name}</span>
                                            <span className="friends-chats__chat-teacher">Преподаватель: {chat.teacher}</span>
                                            <span className="friends-chats__chat-last-message">
                                                {chat.lastMessage || 'Нет сообщений'}
                                            </span>
                                        </div>
                                        <div className="friends-chats__chat-meta">
                                            {chat.unreadCount > 0 && (
                                                <span className="friends-chats__unread-badge">{chat.unreadCount}</span>
                                            )}
                                            <span className="friends-chats__chat-arrow">→</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default FriendsAndChats;