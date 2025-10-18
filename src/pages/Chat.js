import { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    getChatMessages,
    sendChatMessage,
    getUser,
    markMessagesAsRead,
    getUserChats,
    getChatParticipants,
    editChatMessage,
    deleteChatMessage
} from '../services/firestore';
import './Chat.css';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';
import FullscreenImage from "./FullscreenImage";

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
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userChats, setUserChats] = useState([]);
    const [currentChatInfo, setCurrentChatInfo] = useState(null);
    const [participants, setParticipants] = useState([]);
    const [showParticipants, setShowParticipants] = useState(false);

    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const unreadSeparatorRef = useRef(null);
    const participantsRef = useRef(null);
    const [editingMessageId, setEditingMessageId] = useState(null);

    const handleDeleteMessage = async (messageId) => {
        if (!window.confirm('Вы уверены, что хотите удалить это сообщение?')) return;
        try {
            await deleteChatMessage(courseId, messageId);
        } catch (err) {
            console.error("Ошибка удаления сообщения:", err);
            alert('Ошибка при удалении сообщения');
        }
    };

    const navigateToProfile = (userId) => {
        if (userId !== user.uid) {
            navigate(`/profile/${userId}`);
        }
    };

    const handleEditClick = (msg) => {
        setEditingMessageId(msg.id);
        setNewMessage(msg.text || '');
    };

    useEffect(() => {
        const fetchParticipants = async () => {
            const participantsList = await getChatParticipants(courseId);
            setParticipants(participantsList);
        };
        fetchParticipants();
    }, [courseId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (participantsRef.current && !participantsRef.current.contains(event.target)) {
                setShowParticipants(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        if (fileInputRef.current) fileInputRef.current.value = '';
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

            if (editingMessageId) {
                await editChatMessage(courseId, editingMessageId, newMessage);
                setEditingMessageId(null);
            } else {
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
            }

            setNewMessage('');
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            console.error("Ошибка отправки сообщения:", err);
            alert('Ошибка при отправке сообщения');
        } finally {
            setIsSending(false);
        }
    };

    const formatTime = (date) => format(date, 'HH:mm', { locale: ru });
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
            groupedMessages.push({ type: 'unread', id: `unread-${msg.id}`, timestamp: msgDate });
        }

        if (dateStr !== lastDate) {
            groupedMessages.push({ type: 'date', id: `date-${dateStr}`, dateStr });
            lastDate = dateStr;
        }

        groupedMessages.push({ type: 'message', ...msg, isUnread });
    });

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleParticipants = () => setShowParticipants(!showParticipants);

    return (
        <div>
            <div className={`chat__sidebar ${sidebarOpen ? 'chat__sidebar--open' : ''}`}>
                <div className="chat__sidebar-header">
                    <h2 className="chat__sidebar-title">Чаты курсов</h2>
                </div>
                <div className="chat__current-info">
                    {currentChatInfo && (
                        <>
                            <h3 className="chat__current-name">{currentChatInfo.name}</h3>
                            <p className="chat__current-description">{currentChatInfo.description}</p>
                        </>
                    )}
                </div>
                <div className="chat__list">
                    {userChats.map(chat => (
                        <Link
                            key={chat.id}
                            to={`/chat/${chat.id}`}
                            className={`chat__item ${chat.id === courseId ? 'chat__item--active' : ''}`}
                        >
                            <div className="chat__item-name">{chat.name}</div>
                            <div className="chat__item-last-message">{chat.lastMessage || 'Нет сообщений'}</div>
                        </Link>
                    ))}
                </div>
            </div>

            <div className={`chat ${sidebarOpen ? 'chat--sidebar-open' : ''}`}>
                <button className="chat__button chat__button--toggle" onClick={toggleSidebar}>
                    {sidebarOpen ? '✕' : '☰'}
                </button>

                <div className="chat__main">
                    <div className="chat__header">
                        {courseId !== 'general' ? (
                            <h1 className="chat__title">Чат курса: {currentChatInfo?.name ?? ''}</h1>
                        ) : (
                            <h1 className="chat__title">Общий чат</h1>
                        )}
                        <button
                            className="chat__button chat__button--file"
                            onClick={toggleParticipants}
                            title="Участники чата"
                        >
                            👥
                        </button>
                    </div>

                    {showParticipants && (
                        <div className="chat__participants" ref={participantsRef}>
                            <h3 className="chat__participants-title">Участники чата ({participants.length})</h3>
                            {participants.map(p => (
                                <div
                                    key={p.id}
                                    className="chat__participant"
                                    onClick={() => navigateToProfile(p.id)}
                                >
                                    <div className="chat__participant-avatar">
                                        {p.avatar ? (
                                            <img src={p.avatar} alt={p.name} className="chat__participant-avatar-img" />
                                        ) : (
                                            <div className="chat__participant-avatar-letter">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className="chat__participant-info">
                                        <div className="chat__participant-name">
                                            {p.name}{p.id === user.uid && ' (Вы)'}
                                        </div>
                                        <div className="chat__participant-role">
                                            {p.role === 'teacher' ? 'Преподаватель' : 'Слушатели'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {fullscreenImage && (
                        <div className="chat__modal-overlay" onClick={() => setFullscreenImage(null)}>
                            <FullscreenImage src={fullscreenImage} />
                            <button className="chat__modal-close" onClick={() => setFullscreenImage(null)}>×</button>
                        </div>
                    )}

                    <div className="chat__messages" ref={messagesContainerRef}>
                        {messages.length === 0 && (
                            <div className="chat__empty">
                                <p className="chat__empty-text">Чат пока пуст. Будьте первым, кто напишет сообщение!</p>
                            </div>
                        )}

                        {preview && (
                            <div className="chat__preview">
                                {preview !== 'file' ? (
                                    <img src={preview} alt="Превью" className="chat__preview-image" />
                                ) : (
                                    <div className="chat__preview-file">{getFileIcon(file.name)} {file.name}</div>
                                )}
                                <button type="button" onClick={removeFile} className="chat__remove-button">×</button>
                            </div>
                        )}

                        {!preview && groupedMessages.map(item => {
                            if (item.type === 'date') return <div key={item.id} className="chat__date-separator">{item.dateStr}</div>;
                            if (item.type === 'unread') return (
                                <div key={item.id} className="chat__unread-separator" ref={hasUnreadMessages ? unreadSeparatorRef : null}>
                                    <div className="chat__unread-line"></div>
                                    <div className="chat__unread-label">Новые сообщения</div>
                                    <div className="chat__unread-line"></div>
                                </div>
                            );

                            const isOwn = item.senderId === user.uid;
                            const msgDate = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();

                            return (
                                <div
                                    key={item.id}
                                    className={`chat__message ${isOwn ? 'chat__message--sent' : 'chat__message--received'} ${item.isUnread ? 'chat__message--unread' : ''}`}
                                >
                                    <div className="chat__message-content">
                                        <div className="chat__message-sender">{isOwn ? 'Вы' : item.senderName}</div>
                                        {item.fileData && (
                                            <div className="chat__attachment">
                                                {item.fileType === 'image' ? (
                                                    <img src={item.fileData} alt="Прикрепленное изображение" className="chat__attachment-image" onClick={() => setFullscreenImage(item.fileData)} />
                                                ) : (
                                                    <div className="chat__file-card">
                                                        <div className="chat__file-icon">{getFileIcon(item.fileName)}</div>
                                                        <div className="chat__file-details">
                                                            <div className="chat__file-name">{item.fileName}</div>
                                                            <div className="chat__file-size">{(item.fileSize / 1024).toFixed(1)} KB</div>
                                                            <a href={item.fileData} download={item.fileName} className="chat__download-link">Скачать</a>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {item.text && <div className="chat__message-text">{item.text}{item.editedAt && <span className="chat__message-edited"> (отредактировано)</span>}</div>}

                                        <div className="chat__message-footer">
                                            {(isOwn || userData.role === 'admin') && (
                                                <div className="chat__message-actions">
                                                    <button onClick={() => handleEditClick(item)} title="Редактировать">✎</button>
                                                    <button onClick={() => handleDeleteMessage(item.id)} title="Удалить">🗑️</button>
                                                </div>
                                            )}
                                            <div className="chat__message-time">{formatTime(msgDate)}</div>
                                        </div>

                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSendMessage} className="chat__form">
                        <Link to={`/video-call/${courseId}`} className="chat__button chat__button--call" title="Видеозвонок">📞</Link>
                        <div className="chat__input-group">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={e => setNewMessage(e.target.value)}
                                placeholder="Введите сообщение..."
                                disabled={isSending}
                                className="chat__input"
                            />
                            {editingMessageId && (
                                <button type="button" onClick={() => { setEditingMessageId(null); setNewMessage(''); }} className="chat__button chat__button--cancel" title="Отменить редактирование">✕</button>
                            )}
                            <label className="chat__button chat__button--file" title="Прикрепить файл">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                                    disabled={isSending}
                                    className="chat__file-input"
                                />
                                📎
                            </label>
                        </div>
                        <button type="submit" disabled={(!newMessage.trim() && !file) || isSending} className="chat__button chat__button--send" title={editingMessageId ? "Сохранить изменения" : "Отправить сообщение"}>
                            {isSending ? '...' : editingMessageId ? '💾' : '➤'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Chat;
