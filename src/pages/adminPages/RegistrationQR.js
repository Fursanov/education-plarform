import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './RegistrationQR.css';

function RegistrationQR({ user }) {
    const [qrUrl, setQrUrl] = useState(null);
    const [newRole, setNewRole] = useState('student');
    const [isGenerating, setIsGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const generateQR = async () => {
        setIsGenerating(true);
        setCopied(false);
        try {
            const token = uuidv4();
            const registrationLink = `${window.location.origin}/register?token=${token}`;

            const expiresInHours = 24;
            const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresInHours * 3600 * 1000));

            await setDoc(doc(db, 'qrInvites', token), {
                token,
                createdAt: Timestamp.now(),
                expiresAt,
                used: false,
                role: newRole,
                createdBy: user.uid,
                createdByName: user.name || user.email
            });

            setQrUrl(registrationLink);
        } catch (error) {
            console.error('Ошибка при генерации QR-кода:', error);
            alert('Ошибка при генерации QR-кода');
        } finally {
            setIsGenerating(false);
        }
    };

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(qrUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Ошибка копирования: ', err);
            // Fallback для старых браузеров
            const textArea = document.createElement('textarea');
            textArea.value = qrUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const getRoleDisplayName = (role) => {
        const roles = {
            student: 'Слушатель',
            teacher: 'Преподаватель',
            admin: 'Менеджер'
        };
        return roles[role] || role;
    };

    return (
        <div className="registration-qr-component">
            <h2>Генерация QR-кода для регистрации</h2>

            <label>
                Роль для приглашения:
                <select
                    className="registration-qr-component__select"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                >
                    <option value="student">Слушатель</option>
                    <option value="teacher">Преподаватель</option>
                    <option value="admin">Менеджер</option>
                </select>
            </label>

            <button
                onClick={generateQR}
                className="registration-qr-component__button"
                disabled={isGenerating}
            >
                {isGenerating ? 'Генерация...' : 'Сгенерировать QR-код'}
            </button>

            {qrUrl && (
                <div className="registration-qr-component__qr-display">
                    <QRCodeCanvas
                        value={qrUrl}
                        size={256}
                        bgColor="#ffffff"
                        fgColor="#000000"
                        level="M"
                        includeMargin={true}
                    />
                    <p>
                        <strong>Роль:</strong> {getRoleDisplayName(newRole)} |
                        <strong> Срок:</strong> 24 часа
                    </p>

                    <div className="registration-qr-component__link-section">
                        <p className="registration-qr-component__link-label">
                            Ссылка для регистрации:
                        </p>
                        <div className="registration-qr-component__link-container">
                            <a
                                href={qrUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="registration-qr-component__link"
                            >
                                {qrUrl}
                            </a>
                            <button
                                onClick={copyToClipboard}
                                className={`registration-qr-component__copy-btn ${copied ? 'copied' : ''}`}
                            >
                                {copied ? '✓ Скопировано!' : '📋 Копировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default RegistrationQR;