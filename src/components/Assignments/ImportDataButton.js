import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './importDataButton.css'

function ImportDataButton({user}) {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const handleFileChange = async (e) => {
        setError(null);
        setSuccess(null);
        const file = e.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) throw new Error('Неверный формат данных');

            for (const course of data) {
                const { assignments = [], ...courseData } = course;
                if (!user || !user.uid) {
                    console.error('User not authenticated');
                    return;
                }
                const createdCourse = await addDoc(collection(db, 'courses'), {
                    ...courseData,
                    createdAt: new Date(courseData.createdAt || Date.now()),
                    teacherId: user.uid,
                    students: courseData.students || [],
                    assignments: []
                });

                for (const assignment of assignments) {
                    await addDoc(collection(db, 'assignments'), {
                        ...assignment,
                        courseId: createdCourse.id,
                        dueDate: new Date(assignment.dueDate),
                        createdAt: new Date(),
                        createdBy: user.uid
                    });
                }
            }

            setSuccess('Импорт успешно завершён');
        } catch (err) {
            console.error('Ошибка импорта:', err);
            setError('Не удалось импортировать данные: ' + err.message);
        }
    };

    return (
        <div className="import-button-wrapper">
            <label className="import-label">
                📥 Импортировать курсы и задания
                <input
                    type="file"
                    accept=".json"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                />
            </label>
            {error && <p className="error-message">{error}</p>}
            {success && <p className="success-message">{success}</p>}
        </div>
    );
}

export default ImportDataButton;
