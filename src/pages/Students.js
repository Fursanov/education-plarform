import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Students.css';
import { useParams, useNavigate } from 'react-router-dom';

function Students({ user }) {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);

    const [courseStudents, setCourseStudents] = useState([]); // Студенты в курсе
    const [allStudents, setAllStudents] = useState([]);       // Все студенты из базы

    const [searchTermCourse, setSearchTermCourse] = useState('');
    const [searchTermAll, setSearchTermAll] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const { courseId } = useParams();
    const navigate = useNavigate();

    // Загружаем курсы учителя
    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoading(true);
            const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
            const querySnapshot = await getDocs(q);
            const coursesList = [];
            querySnapshot.forEach((doc) => {
                coursesList.push({ id: doc.id, ...doc.data() });
            });
            setCourses(coursesList);

            if (courseId) {
                const found = coursesList.find(c => c.id === courseId);
                setSelectedCourse(found || null);
            } else if (coursesList.length > 0) {
                setSelectedCourse(coursesList[0]);
            }
            setIsLoading(false);
        };
        fetchCourses();
    }, [user, courseId]);

    // Загружаем всех студентов (роль "student")
    useEffect(() => {
        const fetchAllStudents = async () => {
            setIsLoading(true);
            const q = query(collection(db, "users"), where("role", "==", "student"));
            const querySnapshot = await getDocs(q);
            const studentsList = [];
            querySnapshot.forEach(doc => {
                studentsList.push({ id: doc.id, ...doc.data() });
            });
            setAllStudents(studentsList);
            setIsLoading(false);
        };
        fetchAllStudents();
    }, []);

    // Загружаем студентов выбранного курса
    useEffect(() => {
        if (!selectedCourse) {
            setCourseStudents([]);
            return;
        }
        const fetchCourseStudents = async () => {
            setIsLoading(true);
            if (!selectedCourse.students || selectedCourse.students.length === 0) {
                setCourseStudents([]);
                setIsLoading(false);
                return;
            }

            const studentsList = [];
            for (const studentId of selectedCourse.students) {
                const studentRef = doc(db, "users", studentId);
                const studentSnap = await getDoc(studentRef);
                if (studentSnap.exists()) {
                    studentsList.push({ id: studentId, ...studentSnap.data() });
                }
            }
            setCourseStudents(studentsList);
            setIsLoading(false);
        };
        fetchCourseStudents();
    }, [selectedCourse]);

    // Добавить студента в курс
    const addStudentToCourse = async (studentId) => {
        if (!selectedCourse) {
            alert('Выберите курс');
            return;
        }

        if (selectedCourse.students?.includes(studentId)) {
            alert('Студент уже в курсе');
            return;
        }

        try {
            setIsLoading(true);
            const courseRef = doc(db, "courses", selectedCourse.id);
            const updatedStudents = selectedCourse.students ? [...selectedCourse.students, studentId] : [studentId];
            await updateDoc(courseRef, { students: updatedStudents });
            setSelectedCourse(prev => ({ ...prev, students: updatedStudents }));

            // Обновляем локальный список студентов курса сразу
            const addedStudent = allStudents.find(s => s.id === studentId);
            if (addedStudent) {
                setCourseStudents(prev => [...prev, addedStudent]);
            }

            alert('Студент добавлен в курс');
        } catch (error) {
            console.error(error);
            alert('Ошибка при добавлении студента');
        } finally {
            setIsLoading(false);
        }
    };

    // Удалить студента из курса (твоя реализация)
    const removeStudent = async (studentId) => {
        if (!selectedCourse) return;

        try {
            setIsLoading(true);
            const courseRef = doc(db, "courses", selectedCourse.id);
            const updatedStudents = selectedCourse.students.filter(id => id !== studentId);
            await updateDoc(courseRef, { students: updatedStudents });
            setSelectedCourse(prev => ({ ...prev, students: updatedStudents }));
            setCourseStudents(prev => prev.filter(s => s.id !== studentId));
            alert('Студент удалён из курса');
        } catch (error) {
            console.error(error);
            alert('Ошибка при удалении студента');
        } finally {
            setIsLoading(false);
        }
    };

    // Фильтрация студентов по поиску
    const filteredCourseStudents = courseStudents.filter(s =>
        s.name?.toLowerCase().includes(searchTermCourse.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTermCourse.toLowerCase())
    );

    // Все студенты, кроме тех, кто уже в курсе
    const filteredAllStudents = allStudents
        .filter(s => !selectedCourse?.students?.includes(s.id))
        .filter(s =>
            s.name?.toLowerCase().includes(searchTermAll.toLowerCase()) ||
            s.email?.toLowerCase().includes(searchTermAll.toLowerCase())
        );

    if (isLoading && !selectedCourse) return <div className="loading">Загрузка курсов...</div>;

    return (
        <div className="students-page">
            <button className="btn back-btn" onClick={() => navigate(-1)}>← Вернуться</button>

            <h1>Управление студентами</h1>

            <div className="course-selection">
                <h2>Выберите курс</h2>
                <div className="course-buttons">
                    {courses.map(course => (
                        <button
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className={selectedCourse?.id === course.id ? 'active' : ''}
                        >
                            {course.title}
                        </button>
                    ))}
                </div>
            </div>

            {selectedCourse && (
                <div className="students-container" style={{ display: 'flex', gap: '40px' }}>
                    {/* Студенты курса */}
                    <div className="students-list-block" style={{ flex: 1 }}>
                        <h2>Студенты курса: {selectedCourse.title}</h2>
                        <input
                            type="text"
                            placeholder="Поиск студентов курса..."
                            value={searchTermCourse}
                            onChange={e => setSearchTermCourse(e.target.value)}
                            style={{ marginBottom: '10px', width: '100%' }}
                        />
                        {filteredCourseStudents.length > 0 ? (
                            filteredCourseStudents.map(student => (
                                <div key={student.id} className="student-card">
                                    <div className="student-info">
                                        <span>{student.name}</span>
                                        <span>{student.email}</span>
                                    </div>
                                    <div className="student-actions">
                                        <a href={`/profile/${student.id}`} className="btn profile-btn">
                                            Профиль
                                        </a>
                                        <button
                                            className="btn remove-btn"
                                            onClick={() => removeStudent(student.id)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>Студенты не найдены</p>
                        )}
                    </div>

                    {/* Все студенты */}
                    <div className="students-list-block" style={{ flex: 1 }}>
                        <h2>Все студенты</h2>
                        <input
                            type="text"
                            placeholder="Поиск по всем студентам..."
                            value={searchTermAll}
                            onChange={e => setSearchTermAll(e.target.value)}
                            style={{ marginBottom: '10px', width: '100%' }}
                        />
                        {filteredAllStudents.length > 0 ? (
                            filteredAllStudents.map(student => (
                                <div key={student.id} className="student-card">
                                    <div className="student-info">
                                        <span>{student.name}</span>
                                        <span>{student.email}</span>
                                    </div>
                                    <div className="student-actions">
                                        <button
                                            className="btn add-btn"
                                            onClick={() => addStudentToCourse(student.id)}
                                            disabled={isLoading}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p>Нет доступных студентов для добавления</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Students;
