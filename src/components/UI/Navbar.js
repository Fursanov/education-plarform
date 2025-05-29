import { Link } from 'react-router-dom';
import logo from '../../assets/logo.png';
import './Navbar.css';

function Navbar({ user, toggleSidebar }) {
    return (
        <nav className="navbar">
            <button className="menu-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
                &#9776;
            </button>
            <div className="navbar-container">
                <Link
                    to={user?.role === 'admin' ? '/admin' : '/'}
                    className="navbar-brand"
                >
                    <img src={logo} alt="EduPlatform Logo" className="navbar-logo" />
                    EduPlatform
                </Link>
                <div className="navbar-links">
                    {user?.role === 'teacher' && (
                        <Link to="/" className="navbar-link">Мои курсы</Link>
                    )}
                    {user?.role === 'admin' && (
                        <Link to="/admin" className="navbar-link">Админ-панель</Link>
                    )}
                    <Link to="/profile" className="navbar-link">Профиль</Link>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
