import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { getChatMessages, sendChatMessage, getUser, markMessagesAsRead, getUserChats, getChatParticipants } from '../services/firestore';
import './Chat.css';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

function Chat({ user }) {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userData, setUserData] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [lastReadTime, setLastReadTime] = useState(null);
    const [initialLoad, setInitialLoad] = useState(true);
    const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
    const [userChats, setUserChats] = useState([]);
    const [currentChatInfo, setCurrentChatInfo] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [showParticipants, setShowParticipants] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const unreadSeparatorRef = useRef(null);
    const participantsRef = useRef(null);

    const navigateToProfile = (userId) => {
        if (userId !== user.uid) {
            navigate(`/profile/${userId}`);
        }
    };


    // Получаем список участников чата
    useEffect(() => {
        const fetchParticipants = async () => {
            const participantsList = await getChatParticipants(courseId);
            setParticipants(participantsList);
        };

        fetchParticipants();
    }, [courseId]);

    // Закрываем список участников при клике вне его
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (participantsRef.current && !participantsRef.current.contains(event.target)) {
                setShowParticipants(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Получаем список чатов пользователя
    useEffect(() => {
        const fetchUserChats = async () => {
            if (user?.uid) {
                const chats = await getUserChats(user.uid, userData?.role === "teacher");
                setUserChats(chats);

                // Находим информацию о текущем чате
                const currentChat = chats.find(chat => chat.id === courseId);
                setCurrentChatInfo(currentChat);
            }
        };

        fetchUserChats();
    }, [userData, user, courseId]);

    useEffect(() => {
        const fetchUserData = async () => {
            const data = await getUser(user.uid);
            setUserData(data);
            setLastReadTime(data?.lastReadChatTimes?.[courseId]?.toDate() || null);
        };
        fetchUserData();

        const unsubscribe = getChatMessages(courseId, (messagesList) => {
            setMessages(messagesList);

            if (initialLoad) {
                setInitialLoad(false);
                setTimeout(() => {
                    const container = messagesContainerRef.current;
                    if (!container) return;

                    if (unreadSeparatorRef.current) {
                        container.scrollTop = unreadSeparatorRef.current.offsetTop - container.offsetTop - 50;
                    } else if (messagesEndRef.current) {
                        container.scrollTop = messagesEndRef.current.offsetTop - container.offsetTop;
                    }
                }, 100);
            }
        });

        return () => unsubscribe();
    }, [courseId, user, initialLoad]);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            if (scrollHeight - (scrollTop + clientHeight) < 50) {
                markMessagesAsRead(courseId, user.uid);
                setLastReadTime(new Date());
            }
        };

        container.addEventListener('scroll', handleScroll);
        return () => container.removeEventListener('scroll', handleScroll);
    }, [courseId, user.uid]);

    useEffect(() => {
        if (!file) {
            setPreview(null);
            return;
        }
        if (file.type.startsWith('image/')) {
            const objectUrl = URL.createObjectURL(file);
            setPreview(objectUrl);
            return () => URL.revokeObjectURL(objectUrl);
        } else {
            setPreview('file');
        }
    }, [file]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер: 5MB');
                return;
            }
            setFile(selectedFile);
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !file) || isSending) return;

        try {
            setIsSending(true);
            let fileData = null;
            let fileType = '';

            if (file) {
                fileType = file.type.startsWith('image/') ? 'image' : 'file';
                fileData = await readFileAsBase64(file);
            }

            await sendChatMessage(courseId, {
                text: newMessage,
                senderId: user.uid,
                senderName: userData?.name || 'Аноним',
                timestamp: new Date(),
                ...(fileData && {
                    fileData,
                    fileType,
                    fileName: file.name,
                    fileSize: file.size
                })
            });

            setNewMessage('');
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            // Плавный скролл вниз после отправки
            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error("Error sending message:", err);
            alert('Ошибка при отправке сообщения');
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (date) => {
        return format(date, 'HH:mm', { locale: ru });
    };

    const formatDateSeparator = (date) => {
        if (isToday(date)) return 'Сегодня';
        if (isYesterday(date)) return 'Вчера';
        return format(date, 'dd MMMM yyyy', { locale: ru });
    };

    const getFileIcon = (fileName) => {
        const ext = fileName?.split('.').pop().toLowerCase() || '';
        if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return '🖼️';
        if (['pdf'].includes(ext)) return '📄';
        if (['doc', 'docx'].includes(ext)) return '📝';
        if (['xls', 'xlsx'].includes(ext)) return '📊';
        if (['zip', 'rar', '7z'].includes(ext)) return '🗜️';
        return '📁';
    };

    const groupedMessages = [];
    let lastDate = null;
    let hasUnreadMessages = false;

    messages.forEach((msg) => {
        const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
        const dateStr = formatDateSeparator(msgDate);

        const isUnread = lastReadTime && msgDate > new Date(lastReadTime) && msg.senderId !== user.uid;

        if (isUnread && !hasUnreadMessages) {
            hasUnreadMessages = true;
            groupedMessages.push({
                type: 'unread',
                id: `unread-${msg.id}`,
                timestamp: msgDate
            });
        }

        if (dateStr !== lastDate) {
            groupedMessages.push({
                type: 'date',
                id: `date-${dateStr}`,
                dateStr
            });
            lastDate = dateStr;
        }

        groupedMessages.push({
            type: 'message',
            ...msg,
            isUnread
        });
    });

    const toggleChatSidebar = () => {
        setChatSidebarOpen(!chatSidebarOpen);
    };

    const toggleParticipants = () => {
        setShowParticipants(!showParticipants);
    };

    return (
        <div className={`chat-page telegram-style ${chatSidebarOpen ? 'chatSidebar-open' : ''}`}>
            {/* Кнопка для открытия/закрытия боковой панели */}
            <button className="chatSidebar-toggle" onClick={toggleChatSidebar}>
                {chatSidebarOpen ? '✕' : '☰'}
            </button>

            {/* Боковая панель с чатами */}
            <div className="chat-chatSidebar">
                <div className="chatSidebar-header">
                    <h2>Мои чаты</h2>
                </div>

                <div className="current-chat-info">
                    {currentChatInfo && (
                        <>
                            <h3>{currentChatInfo.name}</h3>
                            <p>{currentChatInfo.description}</p>
                        </>
                    )}
                </div>

                <div className="chat-list">
                    {userChats.map(chat => (
                        <Link
                            key={chat.id}
                            to={`/chat/${chat.id}`}
                            className={`chat-item ${chat.id === courseId ? 'active' : ''}`}
                        >
                            <div className="chat-name">{chat.name}</div>
                            <div className="chat-last-message">{chat.lastMessage || 'Нет сообщений'}</div>
                        </Link>
                    ))}
                </div>
            </div>

            {/* Основное содержимое чата */}
            <div className="chat-main-content">
                <div className="chat-header">
                    <h1>Чат курса: {currentChatInfo?.name || ''}</h1>
                    <button
                        className="participants-btn"
                        onClick={toggleParticipants}
                        title="Участники чата"
                    >
                        👥
                    </button>
                </div>

                {/* Список участников чата */}
                {showParticipants && (
                    <div className="participants-list" ref={participantsRef}>
                        <h3>Участники чата ({participants.length})</h3>
                        <ul>
                            {participants.map((participant) => (
                                <li key={participant.id} className={`${participant.id === user.uid ? "participant-item" : "participant-item participant-item-1"}`} onClick={() => navigateToProfile(participant.id)}>
                                    <div className="participant-avatar">
                                        {participant.avatar ? (
                                            <img
                                                src={participant.avatar}
                                                alt={`Аватар ${participant.name}`}
                                                className="participant-avatar-img"
                                            />
                                        ) : (
                                            <div className="participant-avatar-letter">
                                                {participant.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="participant-info">
                                        <div className="participant-name">
                                            {participant.name}
                                            {participant.id === user.uid && ' (Вы)'}
                                        </div>
                                        <div className="participant-role">
                                            {participant.role === 'teacher' ? 'Преподаватель' : 'Студент'}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {fullscreenImage && (
                    <div className="fullscreen-overlay" onClick={() => setFullscreenImage(null)}>
                        <img
                            src={fullscreenImage}
                            alt="Полноэкранное изображение"
                            className="fullscreen-image"
                            onClick={(e) => e.stopPropagation()}
                        />
                        <button className="close-btn" onClick={() => setFullscreenImage(null)}>×</button>
                    </div>
                )}

                <div className="messages-container" ref={messagesContainerRef}>
                    {messages.length === 0 && (
                        <div className="empty-chat">
                            <p>Чат пока пуст. Будьте первым, кто напишет сообщение!</p>
                        </div>
                    )}

                    {preview && (
                        <div className="file-preview">
                            {preview !== 'file' ? (
                                <img src={preview} alt="Превью" className="preview-image" />
                            ) : (
                                <div className="preview-file">
                                    {getFileIcon(file.name)} {file.name}
                                </div>
                            )}
                            <button type="button" onClick={removeFile} className="remove-file-btn">×</button>
                        </div>
                    )}

                    {!preview && groupedMessages.map((item) => {
                        if (item.type === 'date') {
                            return (
                                <div key={item.id} className="date-separator">
                                    {item.dateStr}
                                </div>
                            );
                        } else if (item.type === 'unread') {
                            return (
                                <div
                                    key={item.id}
                                    className="unread-separator"
                                    ref={hasUnreadMessages ? unreadSeparatorRef : null}
                                >
                                    <div className="unread-line"></div>
                                    <div className="unread-label">Новые сообщения</div>
                                    <div className="unread-line"></div>
                                </div>
                            );
                        } else {
                            const isOwn = item.senderId === user.uid;
                            const msgDate = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
                            return (
                                <div
                                    key={item.id}
                                    className={`message ${isOwn ? 'sent' : 'received'} ${item.isUnread ? 'unread' : ''}`}
                                >
                                    <div className="message-content">
                                        <div className="message-sender">
                                            {isOwn ? 'Вы' : item.senderName}
                                        </div>
                                        {item.fileData && (
                                            <div className="message-attachment">
                                                {item.fileType === 'image' ? (
                                                    <img
                                                        src={item.fileData}
                                                        alt="Прикрепленное изображение"
                                                        className="attachment-image"
                                                        onClick={() => setFullscreenImage(item.fileData)}
                                                    />
                                                ) : (
                                                    <div className="file-card">
                                                        <div className="file-icon">{getFileIcon(item.fileName)}</div>
                                                        <div className="file-details">
                                                            <div className="file-name">{item.fileName}</div>
                                                            <div className="file-size">{(item.fileSize / 1024).toFixed(1)} KB</div>
                                                            <a href={item.fileData} download={item.fileName} className="download-link">
                                                                Скачать
                                                            </a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {item.text && <div className="message-text">{item.text}</div>}

                                        <div className={isOwn ? "message-time-sender" : "message-time"}>{formatTime(msgDate)}</div>
                                    </div>
                                </div>
                            );
                        }
                    })}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="message-form telegram-input">
                    <Link to={`/video-call/${courseId}`} className="call-btn" title="Видеозвонок">📞</Link>
                    <div className="input-group">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Введите сообщение..."
                            disabled={isSending}
                            className="telegram-message-input"
                        />
                        <label className="file-upload-btn" title="Прикрепить файл">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                                disabled={isSending}
                                hidden
                            />
                            📎
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !file) || isSending}
                        className="send-btn"
                        title="Отправить сообщение"
                    >
                        {isSending ? '...' : '➤'}
                    </button>
                </form>
            </div>
        </div>
    );
}

export default Chat;