import { logout } from "../../services/auth";
import { useNavigate } from "react-router-dom";
import './AdminPage.css';

function AdminPage({ user }) {
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            window.location.href = "/login";
        } catch (error) {
            console.error("Ошибка выхода:", error);
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-header">
                <h1>Панель администратора</h1>
                <button onClick={handleLogout} className="btn logout-btn">Выйти</button>
            </div>

            <div className="admin-dashboard">
                <h2>Быстрый доступ</h2>
                <div className="admin-grid">
                    <div
                        className="admin-card"
                        onClick={() => navigate('/admin/users')}
                    >
                        <div className="admin-card-icon">👥</div>
                        <h3>Управление пользователями</h3>
                        <p>Просмотр, редактирование и управление пользователями системы</p>
                        <div className="admin-card-arrow">→</div>
                    </div>

                    <div
                        className="admin-card"
                        onClick={() => navigate('/admin/courses')}
                    >
                        <div className="admin-card-icon">📚</div>
                        <h3>Управление курсами</h3>
                        <p>Создание, редактирование и удаление курсов</p>
                        <div className="admin-card-arrow">→</div>
                    </div>

                    <div
                        className="admin-card"
                        onClick={() => navigate('/admin/analytics')}
                    >
                        <div className="admin-card-icon">📊</div>
                        <h3>Аналитика</h3>
                        <p>Статистика и аналитика по системе</p>
                        <div className="admin-card-arrow">→</div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default AdminPage;