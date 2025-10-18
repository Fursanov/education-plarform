import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    deleteDoc
} from 'firebase/firestore';
import { db } from '../services/firebase';
import './Assignments.css';
import LoadingSpinner from '../components/UI/LoadingSpinner';

function Assignments({ user, userData }) {
    const { courseId } = useParams();
    const [course, setCourse] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        dueDate: '',
        file: null
    });
    const [isTeacher, setIsTeacher] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filePreview, setFilePreview] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                // Получаем данные курса
                const courseDoc = await getDoc(doc(db, "courses", courseId));
                if (!courseDoc.exists()) {
                    throw new Error('Курс не найден');
                }

                setCourse(courseDoc.data());
                setIsTeacher(courseDoc.data().teacherId === user.uid || userData.role === 'admin');

                // Получаем задания курса
                const assignmentsQuery = query(
                    collection(db, "assignments"),
                    where("courseId", "==", courseId)
                );
                const querySnapshot = await getDocs(assignmentsQuery);
                const assignmentsList = [];
                querySnapshot.forEach((doc) => {
                    const data = doc.data();
                    assignmentsList.push({
                        id: doc.id,
                        ...data,
                        dueDate: data.dueDate.toDate(),
                        ...(data.fileData && { fileUrl: data.fileData }) // Для совместимости
                    });
                });
                setAssignments(assignmentsList);
                setIsLoading(false);
            } catch (err) {
                setError(err.message);
                setIsLoading(false);
            }
        };
        fetchData();
    }, [courseId, user]);

    useEffect(() => {
        // Создаем превью для файла
        if (!newAssignment.file) {
            setFilePreview(null);
            return;
        }

        if (newAssignment.file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => setFilePreview(reader.result);
            reader.readAsDataURL(newAssignment.file);
        } else {
            setFilePreview('file');
        }
    }, [newAssignment.file]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.size > 5 * 1024 * 1024) {
            alert('Файл слишком большой. Максимальный размер: 5MB');
            return;
        }
        setNewAssignment({
            ...newAssignment,
            file: selectedFile
        });
    };

    const readFileAsBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            let fileData = null;
            if (newAssignment.file) {
                fileData = await readFileAsBase64(newAssignment.file);
            }

            const docRef = await addDoc(collection(db, "assignments"), {
                courseId,
                title: newAssignment.title,
                description: newAssignment.description,
                dueDate: new Date(newAssignment.dueDate),
                ...(fileData && { fileData, fileName: newAssignment.file.name }),
                createdAt: new Date(),
                createdBy: user.uid
            });

            setAssignments([...assignments, {
                id: docRef.id,
                ...newAssignment,
                fileUrl: fileData, // Для совместимости с существующим кодом
                dueDate: new Date(newAssignment.dueDate)
            }]);

            setNewAssignment({
                title: '',
                description: '',
                dueDate: '',
                file: null
            });
            setFilePreview(null);
        } catch (err) {
            setError('Ошибка при создании задания: ' + err.message);
            console.error("Error creating assignment:", err);
        }
    };

    const handleDeleteAssignment = async (assignmentId) => {
        if (window.confirm('Вы уверены, что хотите удалить это задание?')) {
            try {
                await deleteDoc(doc(db, "assignments", assignmentId));
                setAssignments(assignments.filter(a => a.id !== assignmentId));
            } catch (err) {
                setError('Ошибка при удалении задания: ' + err.message);
            }
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

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">{error}</div>;
    if (!course) return <div className="error-message">Курс не найден</div>;

    return (
        <div className="assignments-page">
            <h1>Задания курса: {course.title}</h1>

            {isTeacher && (
                <div className="create-assignment">
                    <h2>Добавить новое задание</h2>
                    {error && <p className="error">{error}</p>}
                    <form onSubmit={handleSubmit}>
                        <input
                            type="text"
                            placeholder="Название задания"
                            value={newAssignment.title}
                            onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                            required
                        />
                        <textarea
                            placeholder="Описание задания"
                            value={newAssignment.description}
                            onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                            required
                        />
                        <div className="form-group">
                            <label>Срок сдачи:</label>
                            <input
                                type="datetime-local"
                                value={newAssignment.dueDate}
                                onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Файл задания (опционально, до 5MB):</label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.rar,.7z"
                            />
                            {filePreview && (
                                <div className="file-preview">
                                    {filePreview !== 'file' ? (
                                        <img src={filePreview} alt="Превью файла" className="preview-image" />
                                    ) : (
                                        <div className="preview-file">
                                            {getFileIcon(newAssignment.file.name)} {newAssignment.file.name}
                                        </div>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setNewAssignment({...newAssignment, file: null});
                                            setFilePreview(null);
                                        }}
                                        className="remove-file-btn"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>
                        <button type="submit">Создать задание</button>
                    </form>
                </div>
            )}

            <div className="assignments-list">
                {assignments.length > 0 ? (
                    assignments
                        .sort((a, b) => a.dueDate - b.dueDate)
                        .map(assignment => (
                            <div key={assignment.id} className="assignment-card">
                                <h3>{assignment.title}</h3>
                                <p className="assignment-description">{assignment.description}</p>
                                <p className="due-date">
                                    <strong>Срок сдачи:</strong> {assignment.dueDate.toLocaleString()}
                                </p>
                                {assignment.fileUrl && (
                                    <div className="file-attachment">
                                        {assignment.fileUrl.startsWith('data:image/') ? (
                                            <img
                                                src={assignment.fileUrl}
                                                alt="Прикрепленное изображение"
                                                className="attachment-image"
                                                onClick={() => window.open(assignment.fileUrl, '_blank')}
                                            />
                                        ) : (
                                            <div className="file-download-card">
                                                <div className="file-icon">
                                                    {getFileIcon(assignment?.fileName)}
                                                </div>
                                                <div className="file-info">
                                                    <div className="file-name">{assignment?.fileName}</div>
                                                    <a style={{marginLeft: 10+'px'}}
                                                        href={assignment.fileUrl}
                                                        download={assignment?.fileName}
                                                        className="download-btn"
                                                    >
                                                        Скачать
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {isTeacher && (
                                    <div className="assignment-actions">
                                        <button className="btn delete-btn" onClick={() => handleDeleteAssignment(assignment.id)}>
                                            Удалить
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                ) : (
                    <div className="empty-state">
                        <p>Пока нет заданий для этого курса</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Assignments;