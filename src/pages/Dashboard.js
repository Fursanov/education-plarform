import { useEffect, useState } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../services/firebase'; // поправь путь под себя
import { getUser } from '../services/firestore';
import { Link } from 'react-router-dom';
import { logout } from '../services/auth';
import './Dashboard.css';

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
            } catch (error) {
                console.error("Ошибка загрузки данных пользователя:", error);
            } finally {
                setLoadingUser(false);
            }
        };

        fetchUserData();
    }, [user]);

    useEffect(() => {
        if (userData?.role !== 'student') {
            setLoadingStudentCourses(false);
            return;
        }

        const fetchCoursesForStudent = async () => {
            setLoadingStudentCourses(true);
            try {
                const coursesSnapshot = await getDocs(collection(db, 'courses'));
                const coursesList = [];
                coursesSnapshot.forEach(doc => {
                    const course = { id: doc.id, ...doc.data() };
                    if (course.students && course.students.includes(user.uid)) {
                        coursesList.push(course);
                    }
                });
                setStudentCourses(coursesList);
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
                const querySnapshot = await getDocs(q);
                const coursesList = [];
                querySnapshot.forEach((doc) => {
                    coursesList.push({ id: doc.id, ...doc.data() });
                });
                setTeacherCourses(coursesList);
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

    if (loadingUser) return <div className="loading">Загрузка...</div>;

    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <h1>
                    Добро пожаловать, {userData?.name}
                    <span className={`role-tag ${userData?.role}`}>
                        {userData?.role === 'student' && 'Обучающийся'}
                        {userData?.role === 'teacher' && 'Преподаватель'}
                        {userData?.role === 'admin' && 'Администратор'}
                    </span>
                </h1>
                <button onClick={handleLogout} className="btn logout-btn">Выйти</button>
            </div>

            <div className="role-info">
                {userData?.role === 'student' && (
                    <div>
                        <h2>Ваши курсы</h2>
                        {loadingStudentCourses ? (
                            <p>Загрузка курсов...</p>
                        ) : studentCourses.length > 0 ? (
                            <div className="courses-grid">
                                {studentCourses.map(course => (
                                    <div key={course.id} className="course-card">
                                        <h3>{course.title}</h3>
                                        <p>{course.description || 'Описание отсутствует'}</p>
                                        <div className="course-actions">
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
                        <div className="teacher-header">
                            <h2>Мои курсы</h2>
                            <Link to="/create-course" className="btn btn-primary">
                                Создать курс
                            </Link>
                        </div>

                        {loadingTeacherCourses ? (
                            <p>Загрузка курсов...</p>
                        ) : teacherCourses.length > 0 ? (
                            <div className="courses-grid">
                                {teacherCourses.map(course => (
                                    <div key={course.id} className="course-card">
                                        <h3>{course.title}</h3>
                                        <p>{course.description || 'Описание отсутствует'}</p>
                                        <div className="course-actions">
                                            <Link to={`/assignments/${course.id}`}>Задания</Link>
                                            <Link to={`/students/${course.id}`}>Студенты</Link>
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

                {userData?.role === 'admin' && (
                    <div>
                        <h2>Административная панель</h2>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1.5rem' }}>
                            <Link to="/admin/users" className="btn btn-primary">Управление пользователями</Link>
                            <Link to="/admin/courses" className="btn btn-primary">Управление курсами</Link>
                            <Link to="/admin/analytics" className="btn btn-primary">Аналитика</Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;