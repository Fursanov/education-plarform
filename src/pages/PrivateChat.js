import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { sendPrivateMessage, getPrivateMessages, getUser } from '../services/firestore';
import './Chat.css';
import { format, isToday, isYesterday } from 'date-fns';
import { ru } from 'date-fns/locale';

function PrivateChat({ currentUser }) {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recipientData, setRecipientData] = useState(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [fullscreenImage, setFullscreenImage] = useState(null);
    const messagesEndRef = useRef(null);
    const messagesContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const recipient = await getUser(userId);
                setRecipientData(recipient);

                const chatMessages = await getPrivateMessages(currentUser.uid, userId);
                setMessages(chatMessages);

                setTimeout(() => {
                    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                }, 100);
            } catch (err) {
                setError("Не удалось загрузить сообщения");
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [userId, currentUser]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if ((!newMessage.trim() && !file)) return;

        try {
            let fileData = null;
            let fileType = '';

            if (file) {
                fileType = file.type.startsWith('image/') ? 'image' : 'file';
                fileData = await readFileAsBase64(file);
            }

            // Создаем объект нового сообщения
            const newMsg = {
                from: currentUser.uid,
                to: userId,
                text: newMessage,
                timestamp: new Date(),
                ...(fileData && {
                    fileData,
                    fileType,
                    fileName: file.name,
                    fileSize: file.size
                })
            };

            // Отправляем сообщение
            await sendPrivateMessage(newMsg);

            // Добавляем сообщение в локальное состояние
            setMessages(prev => [...prev, newMsg]);

            setNewMessage('');
            setFile(null);
            setPreview(null);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }

            setTimeout(() => {
                messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            }, 100);
        } catch (err) {
            setError("Не удалось отправить сообщение");
            console.error(err);
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

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.size > 5 * 1024 * 1024) {
                alert('Файл слишком большой. Максимальный размер: 5MB');
                return;
            }
            setFile(selectedFile);

            if (selectedFile.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = () => setPreview(reader.result);
                reader.readAsDataURL(selectedFile);
            } else {
                setPreview('file');
            }
        }
    };

    const removeFile = () => {
        setFile(null);
        setPreview(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
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

    const formatTime = (date) => {
        return format(date, 'HH:mm', { locale: ru });
    };

    const formatDateSeparator = (date) => {
        if (isToday(date)) return 'Сегодня';
        if (isYesterday(date)) return 'Вчера';
        return format(date, 'dd MMMM yyyy', { locale: ru });
    };

    const groupedMessages = [];
    let lastDate = null;

    messages.forEach((msg) => {
        const msgDate = msg.timestamp?.toDate ? msg.timestamp.toDate() : new Date();
        const dateStr = formatDateSeparator(msgDate);

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
            ...msg
        });
    });

    if (loading) return <div className="loading">Загрузка чата...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="chat-page">
            <div className="chat-main-content">
                <div className="chat-header">
                    <button onClick={() => navigate(-1)} className="back-button">← Назад</button>
                    <div className="recipient-info">
                        {recipientData?.avatar ? (
                            <img
                                src={recipientData.avatar}
                                alt={recipientData.name}
                                className="participant-avatar-img1"
                                onClick={() => navigate(`/profile/${userId}`)}
                            />
                        ) : (
                            <div
                                className="participant-avatar-letter1"
                                onClick={() => navigate(`/profile/${userId}`)}
                            >
                                {recipientData?.name?.charAt(0) || 'U'}
                            </div>
                        )}
                        <h1>{recipientData?.name || 'Пользователь'}</h1>
                    </div>
                </div>

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
                            <p>Чат пока пуст. Начните общение!</p>
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
                        } else {
                            const isOwn = item.from === currentUser.uid;
                            const msgDate = item.timestamp?.toDate ? item.timestamp.toDate() : new Date();
                            return (
                                <div
                                    key={item.id}
                                    className={`message ${isOwn ? 'sent' : 'received'}`}
                                >
                                    <div className="message-content">
                                        <div className="message-sender">
                                            {isOwn ? 'Вы' : recipientData?.name || 'Пользователь'}
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
                    <div className="input-group">
                        <input
                            type="text"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Введите сообщение..."
                            className="telegram-message-input"
                        />
                        <label className="file-upload-btn" title="Прикрепить файл">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                                hidden
                            />
                            📎
                        </label>
                    </div>
                    <button
                        type="submit"
                        disabled={!newMessage.trim() && !file}
                        className="send-btn"
                        title="Отправить сообщение"
                    >
                        ➤
                    </button>
                </form>
            </div>
        </div>
    );
}

export default PrivateChat;