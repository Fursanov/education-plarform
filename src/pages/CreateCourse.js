import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import './CreateCourse.css';

function CreateCourse({ user }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('Название курса обязательно');
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), {
                title,
                description,
                teacherId: user.uid,
                students: [],
                assignments: [],
                createdAt: new Date()
            });
            navigate('/dashboard');
        } catch (err) {
            console.error("Ошибка при создании курса:", err);
            setError('Не удалось создать курс');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="create-course-page">
            <h1>Создание нового курса</h1>

            <form onSubmit={handleSubmit} className="course-form">
                <div className="form-group">
                    <label htmlFor="title">Название курса*</label>
                    <input
                        id="title"
                        type="text"
                        value={title}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setError('');
                        }}
                        placeholder="Введите название курса"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Описание курса</label>
                    <textarea
                        id="description"
                        className="add-course-area"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Добавьте описание курса"
                        rows="4"
                    />
                </div>

                {error && <div className="error-message">{error}</div>}

                <div className="form-actions">
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Создание...' : 'Создать курс'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => navigate('/dashboard')}
                        disabled={isSubmitting}
                    >
                        Отмена
                    </button>
                </div>
            </form>
        </div>
    );
}

export default CreateCourse;