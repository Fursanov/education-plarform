import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { sendPrivateMessage, getPrivateMessages, getUser } from '../services/firestore';
import './PrivateChat.css';
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
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const recipient = await getUser(userId);
                setRecipientData(recipient);

                const chatMessages = await getPrivateMessages(currentUser.uid, userId);
                setMessages(chatMessages);

                // Автоскролл к новым сообщениям
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
        if (!newMessage.trim() && !file) return;

        try {
            let fileData = null;
            let fileType = '';

            if (file) {
                fileType = file.type.startsWith('image/') ? 'image' : 'file';
                fileData = await readFileAsBase64(file);
            }

            await sendPrivateMessage({
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
            });

            setNewMessage('');
            setFile(null);
            setPreview(null);

            // Скролл к новому сообщению
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

    if (loading) return <div className="loading">Загрузка чата...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="private-chat-container">
            <div className="chat-header">
                <button onClick={() => navigate(-1)} className="back-button">← Назад</button>
                <div
                    className="recipient-info"
                    onClick={() => navigate(`/profile/${userId}`)}
                >
                    {recipientData?.avatar ? (
                        <img src={recipientData.avatar} alt={recipientData.name} className="recipient-avatar" />
                    ) : (
                        <div className="avatar-placeholder1">
                            {recipientData?.name?.charAt(0) || 'U'}
                        </div>
                    )}
                    <div>
                        <h3>{recipientData?.name || 'Пользователь'}</h3>
                        <div className="recipient-status">online</div>
                    </div>
                </div>
            </div>

            <div className="messages-container">
                {messages.length === 0 ? (
                    <div className="empty-chat">Нет сообщений. Начните общение!</div>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${msg.from === currentUser.uid ? 'sent' : 'received'}`}
                        >
                            <div className="message-content">
                                {msg.fileData && (
                                    <div className="message-attachment">
                                        {msg.fileType === 'image' ? (
                                            <img
                                                src={msg.fileData}
                                                alt="Прикрепленное изображение"
                                                className="attachment-image"
                                            />
                                        ) : (
                                            <div className="file-card">
                                                <div className="file-icon">{getFileIcon(msg.fileName)}</div>
                                                <div className="file-details">
                                                    <div className="file-name">{msg.fileName}</div>
                                                    <div className="file-size">{(msg.fileSize / 1024).toFixed(1)} KB</div>
                                                    <a href={msg.fileData} download={msg.fileName} className="download-link">
                                                        Скачать
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {msg.text && <div className="message-text">{msg.text}</div>}
                                <div className="message-time">
                                    {formatTime(msg.timestamp?.toDate() || new Date())}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

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

            <form onSubmit={handleSendMessage} className="message-form">
                <div className="input-group">
                    <label className="file-upload-btn">
                        <input
                            type="file"
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                            hidden
                        />
                        📎
                    </label>
                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Введите сообщение..."
                        className="message-input"
                    />
                    <button
                        type="submit"
                        className="send-button"
                        disabled={!newMessage.trim() && !file}
                    >
                        Отправить
                    </button>
                </div>
            </form>
        </div>
    );
}

export default PrivateChat;