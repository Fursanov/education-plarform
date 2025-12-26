import {
    LiveKitRoom,
    VideoConference,
} from '@livekit/components-react';

import '@livekit/components-styles';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './VideoCall.css';

function VideoCall({ user, userData }) {
    const [token, setToken] = useState(null);
    const { courseId } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        fetch('https://livekit-token-server-ytww.onrender.com/livekit/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                room: courseId,
                userId: user.uid,
                name: userData.name,
            }),
        })
            .then(res => res.json())
            .then(data => setToken(data.token))
            .catch(err => console.error(err));
    }, [courseId, user.uid, userData.name]);

    if (!token) return <div>Подключение...</div>;

    return (
        <div className="video-call-page">
            <div className="video-call-container">
                <LiveKitRoom
                    token={token}
                    serverUrl="wss://education-platform-ydvnk42a.livekit.cloud"
                    connect
                    onDisconnected={() => navigate(-1)}
                    data-lk-theme="default"
                >
                    <VideoConference />
                </LiveKitRoom>
            </div>
        </div>
    );
}


export default VideoCall;
