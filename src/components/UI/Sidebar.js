import React from 'react';
import { Link } from 'react-router-dom';
import './Sidebar.css';

const Sidebar = ({ user, isOpen, toggleSidebar }) => {
    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <h3>Меню</h3>
            </div>
            <div className="sidebar-content">
                <Link to="/" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-home"></i> Главная
                </Link>
                <Link to="/chat/general" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-comments"></i> Общий чат
                </Link>
                <Link to="/assignments" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-tasks"></i> Задания
                </Link>
                {user?.role === 'admin' && (
                    <Link to="/admin" className="sidebar-links" onClick={toggleSidebar}>
                        <i className="fas fa-user-shield"></i> Админ-панель
                    </Link>
                )}
                <Link to="/students" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-users"></i> Студенты
                </Link>
                <Link to="/settings" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-cog"></i> Настройки
                </Link>
            </div>
            <div className="sidebar-footer">
                <div className="user-info">
                    <img src={user?.photoURL || '/default-avatar.png'} alt="User" className="user-avatar" />
                    <span className="user-name">{user?.displayName || 'Пользователь'}</span>
                </div>
            </div>
        </div>
    );
};

export default Sidebar;