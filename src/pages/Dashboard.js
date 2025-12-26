import { useEffect, useState } from 'react';
import { collection, getDocs, query, Timestamp, where } from 'firebase/firestore';
import { db } from '../services/firebase'; // поправь путь под себя
import { getUser, updateUser } from '../services/firestore';
import { Link } from 'react-router-dom';
import { logout } from '../services/auth';
import './Dashboard.css';
import ImportDataButton from "../components/Assignments/ImportDataButton";
import LoadingSpinner from "../components/UI/LoadingSpinner";

function Dashboard({ user }) {
    const [userData, setUserData] = useState(null);
    const [studentCourses, setStudentCourses] = useState([]);
    const [teacherCourses, setTeacherCourses] = useState([]);
    const [loadingUser, setLoadingUser] = useState(true);
    const [loadingStudentCourses, setLoadingStudentCourses] = useState(true);
    const [loadingTeacherCourses, setLoadingTeacherCourses] = useState(true);

    useEffect(() => {
        const fetchUserData = async () => {
            setLoadingUser(true);
            try {
                const data = await getUser(user.uid);
                setUserData(data);

                // Обновляем lastLoginAt при каждом заходе
                await updateUser(user.uid, { lastLoginAt: Timestamp.now() });
            } catch (error) {
                console.error("Ошибка загрузки данных пользователя:", error);
            } finally {
                setLoadingUser(false);
            }
        };

        if (user) {
            fetchUserData();
        }
    }, [user]);

    useEffect(() => {
        if (userData?.role !== 'student') {
            setLoadingStudentCourses(false);
            return;
        }

        const fetchCoursesForStudent = async () => {
            setLoadingStudentCourses(true);
            try {
                const snapshot = await getDocs(collection(db, 'courses'));
                const courses = [];
                snapshot.forEach(doc => {
                    const course = { id: doc.id, ...doc.data() };
                    if (course.students?.includes(user.uid)) {
                        courses.push(course);
                    }
                });
                setStudentCourses(courses);
            } catch (error) {
                console.error("Ошибка загрузки курсов:", error);
            } finally {
                setLoadingStudentCourses(false);
            }
        };

        fetchCoursesForStudent();
    }, [userData, user.uid]);

    useEffect(() => {
        if (userData?.role !== 'teacher') {
            setLoadingTeacherCourses(false);
            return;
        }

        const fetchCoursesForTeacher = async () => {
            setLoadingTeacherCourses(true);
            try {
                const q = query(collection(db, "courses"), where("teacherId", "==", user.uid));
                const snapshot = await getDocs(q);
                const courses = [];
                snapshot.forEach(doc => courses.push({ id: doc.id, ...doc.data() }));
                setTeacherCourses(courses);
            } catch (error) {
                console.error("Ошибка загрузки курсов преподавателя:", error);
            } finally {
                setLoadingTeacherCourses(false);
            }
        };

        fetchCoursesForTeacher();
    }, [userData, user.uid]);

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/login";
        } catch (error) {
            console.error("Ошибка выхода:", error);
        }
    };

    if (loadingUser) {
        return (
            <div className="dashboard__app-loading">
                <LoadingSpinner />
                <p>Загрузка...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dashboard__header">
                <h1 className="dashboard__title">
                    Добро пожаловать, {userData?.name}
                    <span className={`dashboard__role-tag dashboard__role-tag--${userData?.role}`}>
                        {userData?.role === 'student' && 'Слушатель'}
                        {userData?.role === 'teacher' && 'Преподаватель'}
                        {userData?.role === 'admin' && 'Менеджер'}
                    </span>
                </h1>
                <button onClick={handleLogout} className="dashboard__btn dashboard__logout-btn">
                    Выйти
                </button>
            </div>

            <div className="dashboard__role-info">
                {userData?.role === 'student' && (
                    <div>
                        <h2>Ваши курсы</h2>
                        {loadingStudentCourses ? (
                            <div className="dashboard__app-loading">
                                <LoadingSpinner />
                                <p>Загрузка курсов...</p>
                            </div>
                        ) : studentCourses.length > 0 ? (
                            <div className="dashboard__courses-grid">
                                {studentCourses.map(course => (
                                    <div key={course.id} className="dashboard__course-card">
                                        <h3>{course.courseTitle}</h3>
                                        <p>{course.courseDescription || 'Описание отсутствует'}</p>
                                        <div className="dashboard__course-actions">
                                            <Link to={`/assignments/${course.id}`}>Задания</Link>
                                            <Link to={`/chat/${course.id}`}>Чат</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>У вас пока нет активных курсов.</p>
                        )}
                    </div>
                )}

                {userData?.role === 'teacher' && (
                    <div>
                        <div className="dashboard__teacher-header">
                            <h2>Мои курсы</h2>
                            <Link to="/create-course" className="dashboard__btn dashboard__btn-primary">
                                Создать курс
                            </Link>
                            {/*<ImportDataButton user={user} />*/}
                        </div>

                        {loadingTeacherCourses ? (
                            <div className="dashboard__app-loading">
                                <LoadingSpinner />
                                <p>Загрузка курсов...</p>
                            </div>
                        ) : teacherCourses.length > 0 ? (
                            <div className="dashboard__courses-grid">
                                {teacherCourses.map(course => (
                                    <div key={course.id} className="dashboard__course-card">
                                        <h3>{course.courseTitle}</h3>
                                        <p>{course.courseDescription || 'Описание отсутствует'}</p>
                                        <div className="dashboard__course-actions">
                                            <Link to={`/assignments/${course.id}`}>Задания</Link>
                                            <Link to={`/students/${course.id}`}>Слушатели</Link>
                                            <Link to={`/chat/${course.id}`}>Чат</Link>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p>У вас пока нет созданных курсов.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
