import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../../services/firebase';
import './AdminAnalytics.css';
import LoadingSpinner from "../../components/UI/LoadingSpinner";

function AdminAnalytics({ user }) {
    const [stats, setStats] = useState({
                                           users: 0,
                                           courses: 0,
                                           assignments: 0,
                                           activeUsers: 0
                                       });
    const [userGrowth, setUserGrowth] = useState([]);
    const [courseStats, setCourseStats] = useState([]);
    const [roleDistribution, setRoleDistribution] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [timeRange, setTimeRange] = useState('week');

    // Выносим функцию getStatus на уровень компонента
    const getStatus = (lastLoginAt) => {
        if (!lastLoginAt) return 'offline';

        try {
            const lastLoginTime = lastLoginAt?.toDate ? lastLoginAt.toDate() : new Date(lastLoginAt);
            const diffMs = new Date() - lastLoginTime;
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < 0.1) {
                return 'online';
            } else if (diffHours < 1) {
                return 'recent';
            } else {
                return 'offline';
            }
        } catch (error) {
            console.error('Error calculating status:', error);
            return 'offline';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'online': return '#10B981';
            case 'recent': return '#F59E0B';
            case 'offline': return '#6B7280';
            default: return '#6B7280';
        }
    };

    useEffect(() => {
        fetchAnalyticsData();
    }, [timeRange]);

    const fetchAnalyticsData = async () => {
        try {
            setLoading(true);

            // Получаем все данные параллельно
            const [
                usersSnapshot,
                coursesSnapshot,
                assignmentsSnapshot
            ] = await Promise.all([
                                      getDocs(collection(db, 'users')),
                                      getDocs(collection(db, 'courses')),
                                      getDocs(collection(db, 'assignments'))
                                  ]);

            // Основная статистика
            const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const courses = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const assignments = assignmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const activeUsersCount = users.filter(user => {
                if (!user.lastLoginAt) return false;

                try {
                    const lastLoginTime = user.lastLoginAt?.toDate ? user.lastLoginAt.toDate() : new Date(user.lastLoginAt);
                    const diffHours = (new Date() - lastLoginTime) / (1000 * 60 * 60);
                    return diffHours < 24; // Активны за последние 24 часа
                } catch (error) {
                    console.error('Error processing user last login:', user.id, error);
                    return false;
                }
            }).length;

            setStats({
                         users: users.length,
                         courses: courses.length,
                         assignments: assignments.length,
                         activeUsers: activeUsersCount
                     });

            // Распределение по ролям
            const roles = {
                student: users.filter(u => u.role === 'student').length,
                teacher: users.filter(u => u.role === 'teacher').length,
                admin: users.filter(u => u.role === 'admin').length
            };
            setRoleDistribution([
                                    { name: 'Студенты', value: roles.student, color: '#0369A1' },
                                    { name: 'Преподаватели', value: roles.teacher, color: '#065F46' },
                                    { name: 'Администраторы', value: roles.admin, color: '#991B1B' }
                                ]);

            // Статистика по курсам
            const courseData = courses.map(course => ({
                name: course.courseTitle,
                students: course.students ? course.students.length : 0,
                assignments: assignments.filter(a => a.courseId === course.id).length
            }));
            setCourseStats(courseData.slice(0, 10)); // Топ 10 курсов

            // Рост пользователей
            const growthData = calculateUserGrowth(users, timeRange);
            setUserGrowth(growthData);

            // Последняя активность - исправленная логика
            const activity = users
                .filter(u => u.lastLoginAt) // фильтруем только тех, у кого есть lastLoginAt
                .map(user => {
                    try {
                        const lastLoginDate = user.lastLoginAt?.toDate ? user.lastLoginAt.toDate() : new Date(user.lastLoginAt);
                        return {
                            ...user,
                            lastLogin: lastLoginDate,
                            status: getStatus(user.lastLoginAt)
                        };
                    } catch (error) {
                        console.error('Error processing user:', user.id, error);
                        return {
                            ...user,
                            lastLogin: new Date(0), // дата по умолчанию
                            status: 'offline'
                        };
                    }
                })
                .sort((a, b) => b.lastLogin - a.lastLogin) // сортируем по убыванию даты
                .slice(0, 5) // берем топ-5
                .map(user => ({
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    lastLogin: user.lastLogin,
                    status: user.status
                }));

            setRecentActivity(activity);

        } catch (error) {
            console.error('Ошибка загрузки аналитики:', error);
        } finally {
            setLoading(false);
        }
    };

    const getTimeRangeStart = (range) => {
        const now = new Date();
        switch (range) {
            case 'day':
                return new Date(now.setDate(now.getDate() - 1));
            case 'week':
                return new Date(now.setDate(now.getDate() - 7));
            case 'month':
                return new Date(now.setMonth(now.getMonth() - 1));
            case 'year':
                return new Date(now.setFullYear(now.getFullYear() - 1));
            default:
                return new Date(now.setDate(now.getDate() - 7));
        }
    };

    const calculateUserGrowth = (users, range) => {
        const now = new Date();
        const periods = {
            day: 24,
            week: 7,
            month: 30,
            year: 12
        }[range] || 7;

        const growth = [];

        // Создаем периоды для группировки, включая текущий
        for (let i = periods - 1; i >= 0; i--) {
            const periodStart = new Date(now);
            const periodEnd = new Date(now);

            if (range === 'day') {
                // Для дня: группируем по часам, включая текущий час
                periodStart.setHours(now.getHours() - i, 0, 0, 0);
                periodEnd.setHours(now.getHours() - i + 1, 0, 0, 0);

                // Для текущего часа периодEnd = now
                if (i === 0) {
                    periodEnd.setTime(now.getTime());
                }
            } else {
                // Для недели/месяца/года: группируем по дням, включая текущий день
                periodStart.setDate(now.getDate() - i);
                periodStart.setHours(0, 0, 0, 0);
                periodEnd.setDate(now.getDate() - i + 1);
                periodEnd.setHours(0, 0, 0, 0);

                // Для текущего дня периодEnd = now
                if (i === 0) {
                    periodEnd.setTime(now.getTime());
                }
            }

            // Считаем пользователей, зарегистрированных в этом периоде
            const newUsers = users.filter(user => {
                const userCreatedAt = user.createdAt?.toDate?.() || new Date(user.createdAt);
                return userCreatedAt >= periodStart && userCreatedAt < periodEnd;
            }).length;

            // Форматируем дату для отображения
            let label;
            if (range === 'day') {
                if (i === 0) {
                    label = `${periodStart.getHours()}:00-сейчас`;
                } else {
                    label = `${periodStart.getHours()}:00-${periodEnd.getHours()}:00`;
                }
            } else if (range === 'week') {
                if (i === 0) {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                    }) + ' (сегодня)';
                } else {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short'
                    });
                }
            } else if (range === 'month') {
                if (i === 0) {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short'
                    }) + ' (сегодня)';
                } else {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        day: 'numeric',
                        month: 'short'
                    });
                }
            } else {
                if (i === 0) {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        month: 'long',
                        year: 'numeric'
                    }) + ' (текущий)';
                } else {
                    label = periodStart.toLocaleDateString('ru-RU', {
                        month: 'long',
                        year: 'numeric'
                    });
                }
            }

            growth.push({
                            date: label,
                            users: newUsers,
                            periodStart: new Date(periodStart),
                            periodEnd: new Date(periodEnd),
                            isCurrent: i === 0 // Помечаем текущий период
                        });
        }

        return growth;
    };

    // Функция для форматирования времени последнего входа
    const formatLastLogin = (lastLogin) => {
        const now = new Date();
        const diffMs = now - lastLogin;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffHours < 1) {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return `${diffMinutes} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else if (diffDays === 1) {
            return 'Вчера';
        } else {
            return `${diffDays} дн назад`;
        }
    };

    if (loading) {
        return (
            <div className="app-loading">
                <LoadingSpinner />
                <p>Загрузка аналитики...</p>
            </div>
        );
    }

    return (
        <div className="admin-analytics">
            <div className="admin-analytics-header">
                <h1>Панель аналитики</h1>
                <div className="time-range-selector">
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="analytics-select"
                    >
                        <option value="day">За 24 часа</option>
                        <option value="week">За неделю</option>
                        <option value="month">За месяц</option>
                        <option value="year">За год</option>
                    </select>
                </div>
            </div>

            {/* Основная статистика */}
            <div className="analytics-stats-grid">
                <div className="stat-card analytics-stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-content">
                        <h3>Всего пользователей</h3>
                        <span className="stat-number">{stats.users}</span>
                        <span className="stat-change">
                            +{userGrowth.reduce((sum, day) => sum + day.users, 0)} за период
                        </span>
                    </div>
                </div>

                <div className="stat-card analytics-stat-card">
                    <div className="stat-icon">📚</div>
                    <div className="stat-content">
                        <h3>Курсы</h3>
                        <span className="stat-number">{stats.courses}</span>
                        <span className="stat-change">
                            {courseStats.filter(c => c.students > 0).length} активных
                        </span>
                    </div>
                </div>

                <div className="stat-card analytics-stat-card">
                    <div className="stat-icon">📝</div>
                    <div className="stat-content">
                        <h3>Задания</h3>
                        <span className="stat-number">{stats.assignments}</span>
                        <span className="stat-change">
                            в {courseStats.filter(c => c.assignments > 0).length} курсах
                        </span>
                    </div>
                </div>

                <div className="stat-card analytics-stat-card">
                    <div className="stat-icon">🟢</div>
                    <div className="stat-content">
                        <h3>Активных пользователей</h3>
                        <span className="stat-number">{stats.activeUsers}</span>
                        <span className="stat-change">
                            {stats.activeUsers > 0 ?
                                `${Math.round((stats.activeUsers / stats.users) * 100)}% от всех` :
                                'нет активных'
                            }
                        </span>
                    </div>
                </div>
            </div>

            <div className="analytics-charts-grid">
                {/* Распределение по ролям */}
                <div className="chart-card">
                    <h3>Распределение пользователей по ролям</h3>
                    <div className="role-distribution">
                        {roleDistribution.map((role, index) => (
                            <div key={role.name} className="role-item">
                                <div className="role-info1">
                                    <span
                                        className="role-color"
                                        style={{ backgroundColor: role.color }}
                                    ></span>
                                    <span className="role-name">{role.name}</span>
                                </div>
                                <div className="role-stats">
                                    <span className="role-count">{role.value}</span>
                                    <span className="role-percentage">
                                        ({((role.value / stats.users) * 100).toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Топ курсов по студентам */}
                <div className="chart-card">
                    <h3>Топ курсов по количеству студентов</h3>
                    <div className="courses-ranking">
                        {courseStats
                            .sort((a, b) => b.students - a.students)
                            .slice(0, 5)
                            .map((course, index) => (
                                <div key={course.name} className="course-rank-item">
                                    <div className="rank-position">#{index + 1}</div>
                                    <div className="course-info">
                                        <span className="course-name">{course.name}</span>
                                        <span className="course-meta">
                                            {course.students} студентов • {course.assignments} заданий
                                        </span>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>

                {/* Рост пользователей */}
                <div className="chart-card full-width">
                    <h3>Рост пользователей</h3>
                    <div className="user-growth-chart">
                        {userGrowth.length > 0 ? (
                            userGrowth.map((point, index) => {
                                // Находим максимальное значение пользователей
                                const maxUsers = Math.max(...userGrowth.map(p => p.users));
                                // Вычисляем высоту в процентах (минимум 5% для видимости даже при 0)
                                const heightPercentage = maxUsers > 0
                                    ? (point.users / maxUsers) * 100
                                    : point.users > 0 ? 100 : 5;

                                return (
                                    <div key={index} className="growth-bar-container">
                                        <div className="growth-bar">
                                            <div
                                                className="growth-fill"
                                                style={{
                                                    height: `${heightPercentage}%`
                                                }}
                                            ></div>
                                        </div>
                                        <span className="growth-label">{point.date}</span>
                                        <span className="growth-value">{point.users}</span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="no-data">
                                Нет данных для отображения
                            </div>
                        )}
                    </div>
                </div>

                {/* Последняя активность */}
                <div className="chart-card full-width">
                    <h3>Последняя активность</h3>
                    <div className="recent-activity">
                        {recentActivity.length > 0 ? (
                            recentActivity.map((user, index) => (
                                <div key={index} className="activity-item">
                                    <div className="user-avatar">
                                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                                    </div>
                                    <div className="activity-info">
                                        <span className="user-name-activity">{user.name || 'Без имени'}</span>
                                        <span className="user-role-activity">{user.role}</span>
                                        <span className="last-login-activity">
                                            {formatLastLogin(user.lastLogin)}
                                        </span>
                                    </div>
                                    <div
                                        className="status-indicator-activity"
                                        style={{ backgroundColor: getStatusColor(user.status) }}
                                        title={user.status === 'online' ? 'Online' :
                                            user.status === 'recent' ? 'Был недавно' : 'Offline'}
                                    ></div>
                                </div>
                            ))
                        ) : (
                            <div className="no-activity">
                                Нет данных о последней активности
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminAnalytics;