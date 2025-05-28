import { useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { v4 as uuidv4 } from 'uuid';
import { setDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import './RegistrationQR.css';

function RegistrationQR({ user }) { // по умолчанию student
    const [qrUrl, setQrUrl] = useState(null);
    const [newRole, setNewRole] = useState('student');

    const generateQR = async () => {
        const token = uuidv4(); // одноразовый токен
        const registrationLink = `${window.location.origin}/register?token=${token}`;

        const expiresInHours = 24; // срок действия 24 часа
        const expiresAt = Timestamp.fromDate(new Date(Date.now() + expiresInHours * 3600 * 1000));

        await setDoc(doc(db, 'qrInvites', token), {
            token,
            createdAt: Timestamp.now(),
            expiresAt,
            used: false,
            newRole, // передаём роль из пропсов
        });

        setQrUrl(registrationLink);
    };

    return (
        <div className="registration-qr">
            <h2>Генерация одноразового QR-кода для регистрации</h2>
            <label>
                Выберите роль для нового приглашения:{' '}
                <select
                    className="admin-search-input"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                >
                    <option value="student">Обучающийся</option>
                    <option value="teacher">Преподаватель</option>
                    <option value="admin">Администратор</option>
                </select>
            </label>
            <button onClick={generateQR}>Сгенерировать QR</button>
            {qrUrl && (
                <div className="qr-display">
                    <QRCodeCanvas value={qrUrl} size={256} />
                    <p>Ссылка: <a href={qrUrl} target="_blank" rel="noreferrer">{qrUrl}</a></p>
                </div>
            )}
        </div>
    );
}

export default RegistrationQR;
