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
                <Link to={user?.role === 'admin' ? '/admin' : '/'} className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-home"></i> Главная
                </Link>
                <Link to="/chat/general" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-comments"></i> Общий чат
                </Link>
                <Link to="/friends" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-user-friends"></i> Друзья и чаты
                </Link>
                <Link to="/profile" className="sidebar-links" onClick={toggleSidebar}>
                    <i className="fas fa-cog"></i> Профиль
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;