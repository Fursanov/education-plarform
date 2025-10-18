import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { Link } from 'react-router-dom';
import './AdminCourses.css';
import AdminImportDataButton from "./AdminImportDataButton";
import LoadingSpinner from "../../components/UI/LoadingSpinner";

function AdminCourses({ user }) {
    const [courses, setCourses] = useState([]);
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCourse, setEditingCourse] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newCourse, setNewCourse] = useState({
                                                   courseTitle: '',
                                                   courseDescription: '',
                                                   teacherId: ''
                                               });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [coursesSnapshot, usersSnapshot] = await Promise.all([
                                                                           getDocs(collection(db, 'courses')),
                                                                           getDocs(collection(db, 'users'))
                                                                       ]);

            const coursesList = [];
            coursesSnapshot.forEach(doc => {
                coursesList.push({
                                     id: doc.id,
                                     ...doc.data(),
                                     createdAt: doc.data().createdAt?.toDate() || new Date()
                                 });
            });
            setCourses(coursesList);

            // Получаем всех преподавателей
            const teachersList = usersSnapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.role === 'teacher');
            setTeachers(teachersList);

        } catch (error) {
            console.error("Ошибка загрузки данных:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCourse = async (e) => {
        e.preventDefault();
        if (!newCourse.courseTitle.trim()) {
            alert('Введите название курса');
            return;
        }

        try {
            const courseData = {
                courseTitle: newCourse.courseTitle,
                courseDescription: newCourse.courseDescription || '',
                teacherId: newCourse.teacherId || null,
                students: [],
                createdAt: new Date(),
                createdBy: user.uid
            };

            const docRef = await addDoc(collection(db, 'courses'), courseData);

            setCourses(prev => [...prev, {
                id: docRef.id,
                ...courseData,
                createdAt: new Date()
            }]);

            setNewCourse({
                             courseTitle: '',
                             courseDescription: '',
                             teacherId: ''
                         });
            setShowCreateForm(false);
            alert('Курс успешно создан!');

        } catch (error) {
            console.error("Ошибка создания курса:", error);
            alert('Ошибка при создании курса');
        }
    };

    const handleDeleteCourse = async (courseId) => {
        if (window.confirm('Вы уверены, что хотите удалить этот курс? Все задания курса также будут удалены.')) {
            try {
                // Сначала находим и удаляем все задания курса
                const assignmentsQuery = query(
                    collection(db, 'assignments'),
                    where('courseId', '==', courseId)
                );
                const assignmentsSnapshot = await getDocs(assignmentsQuery);

                // Удаляем все задания курса
                const deleteAssignmentsPromises = assignmentsSnapshot.docs.map(doc =>
                                                                                   deleteDoc(doc.ref)
                );
                await Promise.all(deleteAssignmentsPromises);

                // Затем удаляем сам курс
                await deleteDoc(doc(db, 'courses', courseId));

                // Обновляем состояние
                setCourses(courses.filter(course => course.id !== courseId));

            } catch (error) {
                console.error("Ошибка удаления курса:", error);
                alert('Ошибка при удалении курса');
            }
        }
    };

    const handleEditCourse = async (courseId, updatedData) => {
        try {
            const courseRef = doc(db, 'courses', courseId);
            await updateDoc(courseRef, updatedData);

            setCourses(courses.map(course =>
                                       course.id === courseId ? { ...course, ...updatedData } : course
            ));
            setEditingCourse(null);
        } catch (error) {
            console.error("Ошибка обновления курса:", error);
            alert('Ошибка при обновлении курса');
        }
    };

    const handleAssignTeacher = async (courseId, teacherId) => {
        try {
            const courseRef = doc(db, 'courses', courseId);
            await updateDoc(courseRef, { teacherId });

            setCourses(courses.map(course =>
                                       course.id === courseId ? { ...course, teacherId } : course
            ));
            alert('Преподаватель назначен!');
        } catch (error) {
            console.error("Ошибка назначения преподавателя:", error);
            alert('Ошибка при назначении преподавателя');
        }
    };

    const handleRemoveTeacher = async (courseId) => {
        try {
            const courseRef = doc(db, 'courses', courseId);
            await updateDoc(courseRef, { teacherId: null });

            setCourses(courses.map(course =>
                                       course.id === courseId ? { ...course, teacherId: null } : course
            ));
            alert('Преподаватель удален!');
        } catch (error) {
            console.error("Ошибка удаления преподавателя:", error);
            alert('Ошибка при удалении преподавателя');
        }
    };

    const getTeacherName = (teacherId) => {
        const teacher = teachers.find(t => t.id === teacherId);
        return teacher ? teacher.name : 'Неизвестный преподаватель';
    };

    const filteredCourses = courses.filter(course => {
        const matchesSearch = course.courseTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            course.courseDescription?.toLowerCase().includes(searchTerm.toLowerCase());

        if (filterRole === 'all') return matchesSearch;
        if (filterRole === 'withTeacher') return matchesSearch && course.teacherId;
        if (filterRole === 'withoutTeacher') return matchesSearch && !course.teacherId;

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка курсов...</p>
            </div>
        );
    }

    return (
        <div className="admin-courses">
            <div className="admin-courses-header">
                <h1>Управление курсами</h1>
                <div className="admin-courses-stats">
                    <div className="stat-card">
                        <h3>Всего курсов</h3>
                        <span className="stat-number">{courses.length}</span>
                    </div>
                    <div className="stat-card">
                        <h3>С преподавателем</h3>
                        <span className="stat-number">
                            {courses.filter(course => course.teacherId).length}
                        </span>
                    </div>
                    <div className="stat-card">
                        <h3>Без преподавателя</h3>
                        <span className="stat-number">
                            {courses.filter(course => !course.teacherId).length}
                        </span>
                    </div>
                    <div className="stat-card">
                        <h3>Преподавателей</h3>
                        <span className="stat-number">{teachers.length}</span>
                    </div>
                </div>
            </div>

            <div className="admin-courses-controls">
                <AdminImportDataButton user={user} />
                <div className="search-filter-container">
                    <input
                        type="text"
                        placeholder="Поиск по названию или описанию..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                        className="admin-filter-select"
                    >
                        <option value="all">Все курсы</option>
                        <option value="withTeacher">С преподавателем</option>
                        <option value="withoutTeacher">Без преподавателя</option>
                    </select>
                    <button
                        onClick={() => setShowCreateForm(true)}
                        className="btn-create-course"
                    >
                        + Создать курс
                    </button>
                </div>
            </div>

            {/* Форма создания курса */}
            {showCreateForm && (
                <div className="create-course-modal">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>Создание нового курса</h2>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="close-btn"
                            >
                                ×
                            </button>
                        </div>
                        <form onSubmit={handleCreateCourse} className="create-course-form">
                            <div className="form-group">
                                <label>Название курса *</label>
                                <input
                                    type="text"
                                    value={newCourse.courseTitle}
                                    onChange={(e) => setNewCourse(prev => ({
                                        ...prev,
                                        courseTitle: e.target.value
                                    }))}
                                    placeholder="Введите название курса"
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label>Описание курса</label>
                                <textarea
                                    value={newCourse.courseDescription}
                                    onChange={(e) => setNewCourse(prev => ({
                                        ...prev,
                                        courseDescription: e.target.value
                                    }))}
                                    placeholder="Введите описание курса"
                                    rows="4"
                                />
                            </div>
                            <div className="form-group">
                                <label>Преподаватель</label>
                                <select
                                    value={newCourse.teacherId}
                                    onChange={(e) => setNewCourse(prev => ({
                                        ...prev,
                                        teacherId: e.target.value
                                    }))}
                                >
                                    <option value="">Не назначать</option>
                                    {teachers.map(teacher => (
                                        <option key={teacher.id} value={teacher.id}>
                                            {teacher.name} ({teacher.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-actions">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateForm(false)}
                                    className="btn-cancel"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="btn-submit"
                                >
                                    Создать курс
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="courses-table-container">
                <table className="admin-courses-table">
                    <thead>
                    <tr>
                        <th>Название курса</th>
                        <th>Описание</th>
                        <th>Преподаватель</th>
                        <th>Слушателей</th>
                        <th>Дата создания</th>
                        <th>Действия</th>
                    </tr>
                    </thead>
                    <tbody>
                    {filteredCourses.length === 0 ? (
                        <tr>
                            <td colSpan="6" className="no-courses">
                                Курсы не найдены
                            </td>
                        </tr>
                    ) : (
                        filteredCourses.map(course => (
                            <tr key={course.id}>
                                <td>
                                    {editingCourse === course.id ? (
                                        <input
                                            type="text"
                                            defaultValue={course.courseTitle}
                                            onBlur={(e) => handleEditCourse(course.id, {
                                                courseTitle: e.target.value
                                            })}
                                            className="edit-input"
                                        />
                                    ) : (
                                        <strong>{course.courseTitle}</strong>
                                    )}
                                </td>
                                <td>
                                    {editingCourse === course.id ? (
                                        <textarea
                                            defaultValue={course.courseDescription}
                                            onBlur={(e) => handleEditCourse(course.id, {
                                                courseDescription: e.target.value
                                            })}
                                            className="edit-textarea"
                                        />
                                    ) : (
                                        course.courseDescription || 'Описание отсутствует'
                                    )}
                                </td>
                                <td>
                                    {course.teacherId ? (
                                        <div className="teacher-info">
                                            <span className="teacher-name">
                                                {getTeacherName(course.teacherId)}
                                            </span>
                                            <button
                                                onClick={() => handleRemoveTeacher(course.id)}
                                                className="btn-remove-teacher"
                                                title="Удалить преподавателя"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ) : (
                                        <select
                                            value=""
                                            onChange={(e) => handleAssignTeacher(course.id, e.target.value)}
                                            className="teacher-select"
                                        >
                                            <option value="">Назначить преподавателя</option>
                                            {teachers.map(teacher => (
                                                <option key={teacher.id} value={teacher.id}>
                                                    {teacher.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </td>
                                <td>
                                    <span className="students-count">
                                        {course.students ? course.students.length : 0}
                                    </span>
                                </td>
                                <td>
                                    {course.createdAt.toLocaleDateString('ru-RU')}
                                </td>
                                <td>
                                    <div className="course-actions">
                                        <button
                                            onClick={() => setEditingCourse(
                                                editingCourse === course.id ? null : course.id
                                            )}
                                            className="btn-edit"
                                            title="Редактировать"
                                        >
                                            {editingCourse === course.id ? '✓' : '✎'}
                                        </button>
                                        <Link
                                            to={`/students/${course.id}`}
                                            className="btn-view"
                                            title="Управление слушателями"
                                        >
                                            👥
                                        </Link>
                                        <Link
                                            to={`/assignments/${course.id}`}
                                            className="btn-view"
                                            title="Задания курса"
                                        >
                                            📝
                                        </Link>
                                        <button
                                            onClick={() => handleDeleteCourse(course.id)}
                                            className="btn-delete"
                                            title="Удалить курс"
                                        >
                                            🗑️
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default AdminCourses;