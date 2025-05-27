import './Footer.css';

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <p>© {new Date().getFullYear()} Образовательная платформа. Все права защищены.</p>
            </div>
        </footer>
    );
}

export default Footer;