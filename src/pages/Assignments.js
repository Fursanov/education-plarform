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
    deleteDoc, updateDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import './Assignments.css';
import LoadingSpinner from '../components/UI/LoadingSpinner';

import {
    getStorage,
    ref,
    uploadBytes,
    getDownloadURL
} from 'firebase/storage';

function Assignments({ user, userData }) {
    const { courseId } = useParams();
    const storage = getStorage();

    const [course, setCourse] = useState(null);
    const [assignments, setAssignments] = useState([]);
    const [isTeacher, setIsTeacher] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [newAssignment, setNewAssignment] = useState({
        title: '',
        description: '',
        dueDate: '',
        file: null
    });

    const [filePreview, setFilePreview] = useState(null);

    const [allSubmissions, setAllSubmissions] = useState({});

    useEffect(() => {
        if (!isTeacher) return;

        const fetchAllSubmissions = async () => {
            const q = query(
                collection(db, 'assignmentSubmissions'),
                where('courseId', '==', courseId)
            );
            const snap = await getDocs(q);
            const map = {};
            for (const docSnap of snap.docs) {
                const data = docSnap.data();
                // получаем имя студента
                const studentSnap = await getDoc(doc(db, 'users', data.studentId));
                const studentName = studentSnap.exists() ? studentSnap.data().name : data.studentId;

                if (!map[data.assignmentId]) map[data.assignmentId] = [];
                map[data.assignmentId].push({
                    id: docSnap.id,           // <--- сохраняем id документа Firestore
                    studentId: data.studentId,
                    studentName,              // имя студента
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    submittedAt: data.submittedAt.toDate(),
                    teacherComment: data.teacherComment || '' // пустой комментарий по умолчанию
                });

                for (const assignmentId in map) {
                    map[assignmentId].sort((a, b) => a.submittedAt - b.submittedAt);
                }
            }
            setAllSubmissions(map);
        };

        fetchAllSubmissions();
    }, [courseId, isTeacher]);
    const [mySubmissions, setMySubmissions] = useState({});

    /* ======================= helpers ======================= */

    const handleSaveComment = async (submission) => {
        try {
            const docRef = doc(db, 'assignmentSubmissions', submission.id);
            await updateDoc(docRef, { teacherComment: submission.teacherComment });

            setAllSubmissions(prev => ({
                ...prev,
                [submission.assignmentId]: prev[submission.assignmentId]?.map(s =>
                    s.id === submission.id ? { ...s, teacherComment: submission.teacherComment } : s
                ) || []
            }));

            alert('Комментарий сохранён ✅');
        } catch (e) {
            console.error(e);
            alert('Ошибка при сохранении комментария');
        }
    };

    const uploadFile = async (file, path) => {
        const fileRef = ref(
            storage,
            `${path}/${Date.now()}_${file.name}`
        );
        await uploadBytes(fileRef, file);
        return await getDownloadURL(fileRef);
    };

    /* ======================= load data ======================= */

    useEffect(() => {
        if (!isTeacher) return;

        const fetchAllSubmissions = async () => {
            const q = query(
                collection(db, 'assignmentSubmissions'),
                where('courseId', '==', courseId)
            );
            const snap = await getDocs(q);
            const submissionsMap = {};

            // Получаем все уникальные studentId
            const studentIds = [...new Set(snap.docs.map(d => d.data().studentId))];

            // Подгружаем данные студентов за один раз
            const studentsData = {};
            await Promise.all(
                studentIds.map(async (id) => {
                    const studentSnap = await getDoc(doc(db, 'users', id));
                    studentsData[id] = studentSnap.exists() ? studentSnap.data().name : id;
                })
            );

            snap.forEach(docSnap => {
                const data = docSnap.data();
                if (!submissionsMap[data.assignmentId]) submissionsMap[data.assignmentId] = [];
                submissionsMap[data.assignmentId].push({
                    id: docSnap.id,
                    studentId: data.studentId,
                    studentName: studentsData[data.studentId],
                    fileUrl: data.fileUrl,
                    fileName: data.fileName,
                    submittedAt: data.submittedAt.toDate(),
                    teacherComment: data.teacherComment || ''
                });
            });

            for (const assignmentId in submissionsMap) {
                submissionsMap[assignmentId].sort((a, b) => a.submittedAt - b.submittedAt);
            }

            setAllSubmissions(submissionsMap);
        };

        fetchAllSubmissions();
    }, [courseId, isTeacher]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);

                const courseSnap = await getDoc(doc(db, 'courses', courseId));
                if (!courseSnap.exists()) throw new Error('Курс не найден');

                const courseData = courseSnap.data();
                setCourse(courseData);
                setIsTeacher(
                    courseData.teacherId === user.uid || userData.role === 'admin'
                );

                const q = query(
                    collection(db, 'assignments'),
                    where('courseId', '==', courseId)
                );

                const snap = await getDocs(q);
                const list = snap.docs.map(d => ({
                    id: d.id,
                    ...d.data(),
                    dueDate: d.data().dueDate.toDate()
                })).sort((a, b) => a.dueDate - b.dueDate);

                setAssignments(list);
            } catch (e) {
                setError(e.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [courseId, user.uid, userData.role]);

    /* ======================= student submissions ======================= */

    useEffect(() => {
        if (isTeacher) return;

        const fetchSubmissions = async () => {
            const q = query(
                collection(db, 'assignmentSubmissions'),
                where('courseId', '==', courseId),
                where('studentId', '==', user.uid)
            );

            const snap = await getDocs(q);
            const map = {};
            snap.forEach(d => {
                const assignmentId = d.data().assignmentId;
                if (!map[assignmentId]) map[assignmentId] = [];
                map[assignmentId].push({
                    id: d.id,
                    ...d.data(),
                    submittedAt: d.data().submittedAt.toDate()
                });
                map[assignmentId].sort((a, b) => a.submittedAt - b.submittedAt);
            });
            setMySubmissions(map);
        };

        fetchSubmissions();
    }, [courseId, user.uid, isTeacher]);

    /* ======================= previews ======================= */

    useEffect(() => {
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

    /* ======================= create assignment ======================= */

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            let fileUrl = null;
            let fileName = null;

            if (newAssignment.file) {
                fileUrl = await uploadFile(
                    newAssignment.file,
                    `assignments/${courseId}/${Date.now()}_${newAssignment.file.name}`
                );
                fileName = newAssignment.file.name;
            }

            const docRef = await addDoc(collection(db, 'assignments'), {
                courseId,
                title: newAssignment.title,
                description: newAssignment.description,
                dueDate: new Date(newAssignment.dueDate),
                fileUrl,
                fileName,
                createdBy: user.uid,
                createdAt: new Date()
            });

            setAssignments(prev => [
                ...prev,
                {
                    id: docRef.id,
                    ...newAssignment,
                    fileUrl,
                    fileName,
                    dueDate: new Date(newAssignment.dueDate)
                }
            ]);

            setNewAssignment({
                title: '',
                description: '',
                dueDate: '',
                file: null
            });
            setFilePreview(null);
        } catch (e) {
            setError('Ошибка при создании задания');
        }
    };

    /* ======================= upload solution ======================= */

    const handleUploadSubmission = async (e, assignmentId) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const fileUrl = await uploadFile(
                file,
                `submissions/${courseId}/${assignmentId}/${user.uid}`
            );

            const docRef = await addDoc(collection(db, 'assignmentSubmissions'), {
                assignmentId,
                courseId,
                studentId: user.uid,
                fileUrl,
                fileName: file.name,
                submittedAt: new Date(),
                teacherComment: ''
            });

            setMySubmissions(prev => {
                const prevArr = prev[assignmentId] || [];
                return {
                    ...prev,
                    [assignmentId]: [
                        ...prevArr,
                        {
                            id: docRef.id,
                            fileUrl,
                            fileName: file.name,
                            submittedAt: new Date(),
                            teacherComment: ''
                        }
                    ]
                };
            });

            alert('Задание отправлено ✅');
        } catch (e) {
            console.error(e);
            alert('Ошибка при загрузке решения');
        }
    };

    /* ======================= delete ======================= */

    const handleDeleteAssignment = async (id) => {
        if (!window.confirm('Удалить задание?')) return;
        await deleteDoc(doc(db, 'assignments', id));
        setAssignments(prev => prev.filter(a => a.id !== id));
    };

    const getFileExtension = (fileUrl) => {
        if (!fileUrl) return '';
        const cleanUrl = fileUrl.split('?')[0]; // убираем query параметры
        return cleanUrl.split('.').pop().toLowerCase();
    };

    const getFilePreview = (fileUrl) => {
        const ext = getFileExtension(fileUrl);
        const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

        if (imageExts.includes(ext)) return { type: 'image', src: fileUrl };
        if (ext === 'pdf') return { type: 'icon', icon: '📄' };
        if (['doc','docx'].includes(ext)) return { type: 'icon', icon: '📝' };
        if (['xls','xlsx'].includes(ext)) return { type: 'icon', icon: '📊' };
        if (['zip','rar','7z'].includes(ext)) return { type: 'icon', icon: '🗜️' };
        return { type: 'icon', icon: '📁' };
    };

    /* ======================= ui ======================= */

    if (isLoading) return <LoadingSpinner />;
    if (error) return <div className="error-message">{error}</div>;
    if (!course) return null;

    return (
        <div className="assignments-page">
            <h1>Задания курса: {course.courseTitle}</h1>

            {isTeacher && (
                <form onSubmit={handleSubmit} className="create-assignment">
                    <input
                        placeholder="Название"
                        value={newAssignment.title}
                        onChange={e =>
                            setNewAssignment({ ...newAssignment, title: e.target.value })
                        }
                        required
                    />
                    <textarea
                        placeholder="Описание"
                        value={newAssignment.description}
                        onChange={e =>
                            setNewAssignment({ ...newAssignment, description: e.target.value })
                        }
                        required
                    />
                    <input
                        type="datetime-local"
                        value={newAssignment.dueDate}
                        onChange={e =>
                            setNewAssignment({ ...newAssignment, dueDate: e.target.value })
                        }
                        required
                    />
                    <input
                        type="file"
                        onChange={e =>
                            setNewAssignment({ ...newAssignment, file: e.target.files[0] })
                        }
                    />
                    <button>Создать</button>
                </form>
            )}

            {assignments.map(a => (
                <div key={a.id} className="assignment-card">
                    <h3>{a.title}</h3>
                    <p>{a.description}</p>
                    <p>Срок: {a.dueDate.toLocaleString()}</p>

                    {a.fileUrl && (() => {
                        const preview = getFilePreview(a.fileUrl);
                        if (preview.type === 'image') {
                            return <img src={preview.src} alt={a.fileName} className="assignment-image" />;
                        } else {
                            return (
                                <a
                                    href={a.fileUrl}
                                    className="download-btn"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Скачать файл задания {preview.icon} {a.fileName}
                                </a>
                            );
                        }
                    })()}

                    {!isTeacher && (
                        <div className="student-submission-block">
                            {mySubmissions[a.id]?.length > 0 ? (
                                <>
                                    {mySubmissions[a.id].map((sub) => (
                                        <div key={sub.id} className="submission-item-student">
                                            {sub.fileUrl && (() => {
                                                const preview = getFilePreview(sub.fileUrl);
                                                if (preview.type === 'image') {
                                                    return <img src={preview.src} alt={sub.fileName} className="assignment-image" />;
                                                } else {
                                                    return (
                                                        <a
                                                            href={sub.fileUrl}
                                                            className="download-btn"
                                                            target="_blank"
                                                            rel="noreferrer"
                                                        >
                                                            Скачать решение {preview.icon} {sub.fileName}
                                                        </a>
                                                    );
                                                }
                                            })()}
                                            {sub.teacherComment ? (
                                                <div className="teacher-comment-student">
                                                    <strong>Комментарий преподавателя:</strong>
                                                    <p>{sub.teacherComment}</p>
                                                </div>
                                            ) : (
                                                <div className="teacher-comment-student">
                                                    <strong>Комментариев нет</strong>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    <label className="btn download-btn">
                                        Загрузить новую попытку
                                        <input
                                            hidden
                                            type="file"
                                            onChange={e => handleUploadSubmission(e, a.id)}
                                        />
                                    </label>
                                </>
                            ) : (
                                <label className="btn download-btn">
                                    Загрузить решение
                                    <input
                                        hidden
                                        type="file"
                                        onChange={e => handleUploadSubmission(e, a.id)}
                                    />
                                </label>
                            )}
                        </div>
                    )}

                    {isTeacher && allSubmissions[a.id] && (
                        <div className="submissions-list">
                            <h4>Решения студентов:</h4>
                            {allSubmissions[a.id].map(sub => (
                                <div key={sub.id} className="submission-item">
                                    <div className="submission-header">
                                        <span className="student-name">{sub.studentName}</span>
                                        <span className="submitted-at">{sub.submittedAt.toLocaleString()}</span>
                                        {sub.fileUrl && (() => {
                                            const preview = getFilePreview(sub.fileUrl);
                                            if (preview.type === 'image') {
                                                return <img src={preview.src} alt={sub.fileName} className="assignment-image" />;
                                            } else {
                                                return (
                                                    <a
                                                        href={sub.fileUrl}
                                                        className="download-btn"
                                                        target="_blank"
                                                        rel="noreferrer"
                                                    >
                                                        Скачать решение {preview.icon} {sub.fileName}
                                                    </a>
                                                );
                                            }
                                        })()}
                                    </div>

                                    <div className="teacher-comment">
                                      <textarea
                                          placeholder="Комментарий преподавателя"
                                          value={sub.teacherComment || ''}
                                          onChange={(e) => {
                                              setAllSubmissions(prev => ({
                                                  ...prev,
                                                  [a.id]: prev[a.id].map(s =>
                                                      s.id === sub.id
                                                          ? { ...s, teacherComment: e.target.value }
                                                          : s
                                                  )
                                              }));
                                          }}
                                      />
                                        <button
                                            className="btn save-comment-btn"
                                            onClick={() => handleSaveComment(sub)}
                                        >
                                            Сохранить
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {isTeacher && (
                        <button
                            className="btn delete-btn"
                            onClick={() => handleDeleteAssignment(a.id)}
                        >
                            Удалить
                        </button>
                    )}
                </div>
            ))}
        </div>
    );
}

export default Assignments;
