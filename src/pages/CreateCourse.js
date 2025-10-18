import { useState } from 'react';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useNavigate } from 'react-router-dom';
import './CreateCourse.css';

function CreateCourse({ user }) {
    const [courseTitle, setTitle] = useState('');
    const [courseDescription, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!courseTitle.trim()) {
            setError('Название курса обязательно');
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(db, "courses"), {
                courseTitle,
                courseDescription,
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
        <div className="create-course-container">
            <h1 className="create-course-title">Создание нового курса</h1>

            <form onSubmit={handleSubmit} className="create-course-form">
                <div className="create-course-form-group">
                    <label htmlFor="title" className="create-course-label">
                        Название курса*
                    </label>
                    <input
                        id="title"
                        type="text"
                        className="create-course-input"
                        value={courseTitle}
                        onChange={(e) => {
                            setTitle(e.target.value);
                            setError('');
                        }}
                        placeholder="Введите название курса"
                    />
                </div>

                <div className="create-course-form-group">
                    <label htmlFor="description" className="create-course-label">
                        Описание курса
                    </label>
                    <textarea
                        id="description"
                        className="create-course-textarea create-course-textarea-large"
                        value={courseDescription}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Добавьте описание курса"
                    />
                </div>

                {error && <div className="create-course-error">{error}</div>}

                <div className="create-course-actions">
                    <button
                        type="submit"
                        className="create-course-btn create-course-btn-primary"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? 'Создание...' : 'Создать курс'}
                    </button>
                    <button
                        type="button"
                        className="create-course-btn create-course-btn-secondary"
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