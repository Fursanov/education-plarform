import './AssignmentCard.css';

function AssignmentCard({ assignment, isTeacher }) {
    return (
        <div className="assignment-card">
            <h3>{assignment.title}</h3>
            <p className="description">{assignment.description}</p>
            <p className="due-date">
                Срок сдачи: {assignment.dueDate?.toDate().toLocaleString()}
            </p>
            {assignment.fileUrl && (
                <a
                    href={assignment.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="file-link"
                >
                    Скачать файл задания
                </a>
            )}
            {isTeacher && (
                <div className="assignment-actions">
                    <button>Редактировать</button>
                    <button>Удалить</button>
                </div>
            )}
        </div>
    );
}

export default AssignmentCard;