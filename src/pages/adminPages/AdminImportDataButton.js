import { useState } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './AdminImportDataButton.css';

function AdminImportDataButton({ user }) {
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [loading, setLoading] = useState(false);
    const [assignTeacher, setAssignTeacher] = useState(false);
    const [selectedTeacher, setSelectedTeacher] = useState('');
    const [availableTeachers, setAvailableTeachers] = useState([]);

    // Загружаем список преподавателей при монтировании компонента
    useState(() => {
        const fetchTeachers = async () => {
            try {
                const teachersQuery = query(
                    collection(db, 'users'),
                    where('role', '==', 'teacher')
                );
                const teachersSnapshot = await getDocs(teachersQuery);
                const teachers = teachersSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setAvailableTeachers(teachers);
            } catch (err) {
                console.error('Ошибка загрузки преподавателей:', err);
            }
        };
        fetchTeachers();
    }, []);

    const handleFileChange = async (e) => {
        setError(null);
        setSuccess(null);
        setLoading(true);

        const file = e.target.files[0];
        if (!file) {
            setLoading(false);
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!Array.isArray(data)) {
                throw new Error('Неверный формат данных. Ожидается массив курсов.');
            }

            let importedCount = 0;
            let assignmentsCount = 0;

            for (const course of data) {
                const { assignments = [], ...courseData } = course;

                // Проверяем обязательные поля
                if (!courseData.courseTitle) {
                    throw new Error('Каждый курс должен иметь поле courseTitle');
                }

                // Подготавливаем данные курса
                const courseToCreate = {
                    courseTitle: courseData.courseTitle,
                    courseDescription: courseData.courseDescription || '',
                    students: courseData.students || [],
                    assignments: [],
                    createdAt: new Date(courseData.createdAt || Date.now()),
                    createdBy: user.uid,
                    // Если выбран преподаватель и включена опция назначения
                    teacherId: assignTeacher && selectedTeacher ? selectedTeacher : null
                };

                // Добавляем курс
                const createdCourse = await addDoc(collection(db, 'courses'), courseToCreate);
                importedCount++;

                // Добавляем задания если они есть
                if (assignments && assignments.length > 0) {
                    for (const assignment of assignments) {
                        if (!assignment.title) {
                            console.warn('Пропущено задание без названия');
                            continue;
                        }

                        await addDoc(collection(db, 'assignments'), {
                            title: assignment.title,
                            description: assignment.description || '',
                            dueDate: assignment.dueDate ? new Date(assignment.dueDate) : null,
                            maxScore: assignment.maxScore || 100,
                            courseId: createdCourse.id,
                            createdAt: new Date(),
                            createdBy: user.uid,
                            submissions: []
                        });
                        assignmentsCount++;
                    }
                }
            }

            setSuccess(`Импорт успешно завершён! Создано курсов: ${importedCount}, заданий: ${assignmentsCount}`);

            // Сбрасываем input файла
            e.target.value = '';

        } catch (err) {
            console.error('Ошибка импорта:', err);
            setError('Не удалось импортировать данные: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const downloadTemplate = () => {
        const template = [
            {
                "courseTitle": "Название курса 1",
                "courseDescription": "Описание курса 1",
                "students": ["studentId1", "studentId2"],
                "assignments": [
                    {
                        "title": "Задание 1",
                        "description": "Описание задания 1",
                        "dueDate": "2024-12-31T23:59:59",
                        "maxScore": 100
                    },
                    {
                        "title": "Задание 2",
                        "description": "Описание задания 2",
                        "dueDate": "2024-12-15T23:59:59",
                        "maxScore": 50
                    }
                ]
            },
            {
                "courseTitle": "Название курса 2",
                "courseDescription": "Описание курса 2",
                "students": [],
                "assignments": []
            }
        ];

        const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'template_courses.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="admin-import-wrapper">
            <div className="admin-import-header">
                <h3>Импорт курсов (Менеджер)</h3>
                <button
                    onClick={downloadTemplate}
                    className="download-template-btn"
                    type="button"
                >
                    📋 Скачать шаблон
                </button>
            </div>

            <div className="import-options">
                <label className="option-checkbox">
                    <input
                        type="checkbox"
                        checked={assignTeacher}
                        onChange={(e) => setAssignTeacher(e.target.checked)}
                    />
                    Назначить преподавателя для всех курсов
                </label>

                {assignTeacher && (
                    <div className="teacher-selection">
                        <label>Выберите преподавателя:</label>
                        <select
                            value={selectedTeacher}
                            onChange={(e) => setSelectedTeacher(e.target.value)}
                            className="teacher-select"
                        >
                            <option value="">-- Выберите преподавателя --</option>
                            {availableTeachers.map(teacher => (
                                <option key={teacher.id} value={teacher.id}>
                                    {teacher.name} ({teacher.email})
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            <div className="import-controls">
                <label className="admin-import-label">
                    {loading ? '⏳ Импорт...' : '📥 Импортировать курсы и задания'}
                    <input
                        type="file"
                        accept=".json"
                        onChange={handleFileChange}
                        disabled={loading}
                        style={{ display: 'none' }}
                    />
                </label>
            </div>

            {error && (
                <div className="admin-error-message">
                    ❌ {error}
                </div>
            )}

            {success && (
                <div className="admin-success-message">
                    ✅ {success}
                </div>
            )}

            <div className="import-info">
                <h4>Формат данных:</h4>
                <ul>
                    <li>Файл должен быть в формате JSON</li>
                    <li>Массив объектов курсов</li>
                    <li>Обязательное поле: <code>courseTitle</code></li>
                    <li>Опциональные поля: <code>courseDescription</code>, <code>students</code>, <code>assignments</code></li>
                    <li>Для заданий: <code>title</code> (обязательно), <code>description</code>, <code>dueDate</code>, <code>maxScore</code></li>
                </ul>
            </div>
        </div>
    );
}

export default AdminImportDataButton;