import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getChatMessages, sendChatMessage, getUser, markMessagesAsRead } from '../services/firestore';
import './Chat.css';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

function Chat({ user }) {
    const { courseId } = useParams();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [userData, setUserData] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const [lastReadTime, setLastReadTime] = useState(null);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);

    useEffect(() => {
        const fetchUserData = async () => {
            const data = await getUser(user.uid);
            setUserData(data);
            setLastReadTime(data?.lastReadChatTimes?.[courseId]?.toDate() || null);
        };
        fetchUserData();

        const unsubscribe = getChatMessages(courseId, (messagesList) => {
            setMessages(messagesList);
            scrollToBottom();
        });

        return () => unsubscribe();
    }, [courseId, user]);

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

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
    };

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
            scrollToBottom();
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

    return (
        <div className="chat-page telegram-style">
            <h1>Чат курса</h1>

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
                            <div key={item.id} className="unread-separator">
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
    );
}

export default Chat;