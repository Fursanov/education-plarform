import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import './Students.css';
import { useParams, useNavigate } from 'react-router-dom';
import LoadingSpinner from "../components/UI/LoadingSpinner";

function Students({ user }) {
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [courseStudents, setCourseStudents] = useState([]);
    const [allStudents, setAllStudents] = useState([]);
    const [searchTermCourse, setSearchTermCourse] = useState('');
    const [searchTermAll, setSearchTermAll] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    const { courseId } = useParams();
    const navigate = useNavigate();

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

            const addedStudent = allStudents.find(s => s.id === studentId);
            if (addedStudent) {
                setCourseStudents(prev => [...prev, addedStudent]);
            }

        } catch (error) {
            console.error(error);
            alert('Ошибка при добавлении студента');
        } finally {
            setIsLoading(false);
        }
    };

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

    const filteredCourseStudents = courseStudents.filter(s =>
                                                             s.name?.toLowerCase().includes(searchTermCourse.toLowerCase()) ||
                                                             s.email?.toLowerCase().includes(searchTermCourse.toLowerCase())
    );

    const filteredAllStudents = allStudents
        .filter(s => !selectedCourse?.students?.includes(s.id))
        .filter(s =>
                    s.name?.toLowerCase().includes(searchTermAll.toLowerCase()) ||
                    s.email?.toLowerCase().includes(searchTermAll.toLowerCase())
        );

    if (isLoading && !selectedCourse) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка курсов...</p>
            </div>
        );
    }

    return (
        <div className="students-management">
            <button
                className="students-management__back-btn"
                onClick={() => navigate(-1)}
            >
                ← Вернуться
            </button>

            <h1 className="students-management__title">Управление студентами</h1>

            <div className="students-management__course-selection">
                <h2>Выберите курс</h2>
                <div className="students-management__course-buttons">
                    {courses.map(course => (
                        <button
                            key={course.id}
                            onClick={() => setSelectedCourse(course)}
                            className={`students-management__course-btn ${
                                selectedCourse?.id === course.id ? 'students-management__course-btn--active' : ''
                            }`}
                        >
                            {course.courseTitle}
                        </button>
                    ))}
                </div>
            </div>

            {selectedCourse && (
                <div className="students-management__container">
                    {/* Студенты курса */}
                    <div className="students-management__list-block">
                        <h2 className="students-management__list-title">
                            Студенты курса: {selectedCourse.courseTitle}
                        </h2>
                        <input
                            type="text"
                            placeholder="Поиск студентов курса..."
                            value={searchTermCourse}
                            onChange={e => setSearchTermCourse(e.target.value)}
                            className="students-management__search"
                        />
                        {filteredCourseStudents.length > 0 ? (
                            filteredCourseStudents.map(student => (
                                <div key={student.id} className="students-management__student-card">
                                    <div className="students-management__student-info">
                                        <span className="students-management__student-name">{student.name}</span>
                                        <span className="students-management__student-email">{student.email}</span>
                                    </div>
                                    <div className="students-management__student-actions">
                                        <a
                                            href={`/profile/${student.id}`}
                                            className="students-management__btn students-management__btn--profile"
                                        >
                                            Профиль
                                        </a>
                                        <button
                                            className="students-management__btn students-management__btn--remove"
                                            onClick={() => removeStudent(student.id)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="students-management__empty-state">
                                <p>Студенты не найдены</p>
                            </div>
                        )}
                    </div>

                    {/* Все студенты */}
                    <div className="students-management__list-block">
                        <h2 className="students-management__list-title">Все студенты</h2>
                        <input
                            type="text"
                            placeholder="Поиск по всем студентам..."
                            value={searchTermAll}
                            onChange={e => setSearchTermAll(e.target.value)}
                            className="students-management__search"
                        />
                        {filteredAllStudents.length > 0 ? (
                            filteredAllStudents.map(student => (
                                <div key={student.id} className="students-management__student-card">
                                    <div className="students-management__student-info">
                                        <span className="students-management__student-name">{student.name}</span>
                                        <span className="students-management__student-email">{student.email}</span>
                                    </div>
                                    <div className="students-management__student-actions">
                                        <button
                                            className="students-management__btn students-management__btn--add"
                                            onClick={() => addStudentToCourse(student.id)}
                                            disabled={isLoading}
                                        >
                                            Добавить
                                        </button>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="students-management__empty-state">
                                <p>Нет доступных студентов для добавления</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Students;