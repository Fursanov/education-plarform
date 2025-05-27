import './Message.css';

function Message({ message, isCurrentUser }) {
    return (
        <div className={`message ${isCurrentUser ? 'sent' : 'received'}`}>
            <div className="message-header">
                <span className="sender-name">{message.senderName}</span>
                <span className="message-time">
          {message.timestamp?.toDate().toLocaleTimeString()}
        </span>
            </div>
            <div className="message-content">{message.text}</div>
        </div>
    );
}

export default Message;