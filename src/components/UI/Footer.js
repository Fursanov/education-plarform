import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-decoration left">🌿</div>
            <div className="footer-container">
                <p>© {new Date().getFullYear()} Система повышения квалификации и переподготовки кадров. Все права защищены.</p>
            </div>
            <div className="footer-decoration right">📚</div>
        </footer>
    );
}

export default Footer;