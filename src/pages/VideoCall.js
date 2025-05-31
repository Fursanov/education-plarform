import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Peer from 'simple-peer';
import { db } from '../services/firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import './VideoCall.css';

function VideoCall({ user }) {
    const { courseId } = useParams();
    const navigate = useNavigate();
    const userVideo = useRef();
    const peersRef = useRef({});
    const [remoteStreams, setRemoteStreams] = useState({});
    const [localStream, setLocalStream] = useState(null);
    const [error, setError] = useState(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const roomRef = doc(db, 'videoCalls', courseId);
    const isMountedRef = useRef(true);

    // Инициализация комнаты и медиапотоков
    useEffect(() => {
        isMountedRef.current = true;

        const initialize = async () => {
            try {
                // 1. Инициализация комнаты в Firestore
                const roomSnap = await getDoc(roomRef);
                if (!roomSnap.exists()) {
                    await setDoc(roomRef, {
                        participants: {},
                        signals: {},
                        createdAt: new Date()
                    });
                }

                // 2. Получение медиапотока
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: true
                });

                if (!isMountedRef.current) {
                    mediaStream.getTracks().forEach(track => track.stop());
                    return;
                }

                setLocalStream(mediaStream);
                if (userVideo.current) {
                    userVideo.current.srcObject = mediaStream;
                }

                // 3. Обновление статуса участника
                await updateDoc(roomRef, {
                    [`participants.${user.uid}`]: true
                });

            } catch (err) {
                console.error('Initialization error:', err);
                if (isMountedRef.current) {
                    setError(err.message);
                }
            }
        };

        initialize();

        return () => {
            isMountedRef.current = false;
            cleanupResources();
        };
    }, []);

    // Обработка подключений
    useEffect(() => {
        if (!localStream) return;

        const unsubscribe = onSnapshot(roomRef, (snapshot) => {
            if (!snapshot.exists()) return;
            const roomData = snapshot.data();

            // 1. Получаем активных участников
            const participants = roomData.participants || {};
            const activeParticipants = Object.keys(participants)
                .filter(id => id !== user.uid && participants[id]);

            // 2. Удаляем отключившихся участников
            Object.keys(peersRef.current).forEach(peerId => {
                if (!activeParticipants.includes(peerId)) {
                    cleanupPeer(peerId);
                }
            });

            // 3. Обрабатываем сигналы
            const signals = roomData.signals || {};
            Object.entries(signals).forEach(([fromId, toUsers]) => {
                if (fromId === user.uid) return;

                if (!toUsers) return; // <-- Добавленная проверка

                const signal = toUsers[user.uid];
                if (!signal) return;

                if (peersRef.current[fromId]) {
                    try {
                        peersRef.current[fromId].signal(signal);
                    } catch (err) {
                        console.error('Error signaling peer:', err);
                    }
                } else if (activeParticipants.includes(fromId)) {
                    createPeer(fromId, false, signal);
                }
            });

            // 4. Создаем исходящие соединения
            activeParticipants.forEach(peerId => {
                if (!peersRef.current[peerId] && !signals[peerId]?.[user.uid]) {
                    if (user.uid < peerId) {
                        console.log(`I (${user.uid}) initiate connection with ${peerId}`);
                        createPeer(peerId, true);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [localStream]);

    const createPeer = (peerId, isInitiator, signal = null) => {
        if (peersRef.current[peerId]) return;

        const peer = new Peer({
            initiator: isInitiator,
            trickle: true,
            stream: localStream,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            }
        });

        peer.on('signal', data => {
            updateDoc(roomRef, {
                [`signals.${user.uid}.${peerId}`]: data
            }).catch(err => console.error('Signal update error:', err));
        });

        peer.on('stream', stream => {
            setRemoteStreams(prev => ({ ...prev, [peerId]: stream }));
        });

        peer.on('error', err => {
            console.error(`Peer ${peerId} error:`, err);
            cleanupPeer(peerId);
        });

        peer.on('close', () => {
            cleanupPeer(peerId);
        });

        if (signal) {
            try {
                peer.signal(signal);
            } catch (err) {
                console.error('Error signaling peer:', err);
                cleanupPeer(peerId);
                return;
            }
        }

        peersRef.current[peerId] = peer;
    };

    const cleanupPeer = (peerId) => {
        if (!peersRef.current[peerId]) return;

        if (!peersRef.current[peerId].destroyed) {
            peersRef.current[peerId].destroy();
        }
        delete peersRef.current[peerId];

        setRemoteStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[peerId];
            return newStreams;
        });

        updateDoc(roomRef, {
            [`signals.${user.uid}.${peerId}`]: null
        }).catch(err => console.error('Cleanup update error:', err));
    };

    const cleanupResources = async () => {
        Object.keys(peersRef.current).forEach(peerId => {
            cleanupPeer(peerId);
        });

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }

        try {
            await updateDoc(roomRef, {
                [`participants.${user.uid}`]: false,
                [`signals.${user.uid}`]: null
            });
        } catch (err) {
            console.error('Cleanup error:', err);
        }
    };

    const toggleMute = () => {
        if (localStream) {
            localStream.getAudioTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsMuted(!isMuted);
        }
    };

    const toggleVideo = () => {
        if (localStream) {
            localStream.getVideoTracks().forEach(track => {
                track.enabled = !track.enabled;
            });
            setIsVideoOff(!isVideoOff);
        }
    };

    const endCall = async () => {
        await cleanupResources();
        navigate(`/chat/${courseId}`);
    };

    return (
        <div className="video-call-container">
            {error && <div className="error-message">{error}</div>}

            <div className="video-grid">
                <div className="video-item">
                    <video
                        ref={userVideo}
                        autoPlay
                        playsInline
                        muted
                        className="video-self"
                    />
                    {isVideoOff && (
                        <div>
                            (
                            <div className="video-placeholder">
                                {user?.avatar ? (
                                    <img src={user?.avatar} alt={`Аватар ${user?.name}`} className="user-avatar" />
                                ) : (
                                    <div className="avatar-fallback">
                                        {user?.name?.charAt(0) || 'У'}
                                    </div>
                                )}
                            </div>
                            )
                            <div className="user-name">{user?.name}</div>
                        </div>
                        )}
                    <div className="user-name">Вы ({isMuted ? 'микрофон выключен' : 'микрофон включен'})</div>
                </div>

                {Object.entries(remoteStreams).map(([peerId, stream]) => (
                    <PeerVideo key={peerId} stream={stream} />
                ))}
            </div>

            <div className="call-controls">
                <button onClick={toggleMute} className={`btn ${isMuted ? 'btn-secondary' : 'btn-primary'}`}>
                    {isMuted ? 'Включить звук' : 'Выключить звук'}
                </button>
                <button onClick={toggleVideo} className={`btn ${isVideoOff ? 'btn-secondary' : 'btn-primary'}`}>
                    {isVideoOff ? 'Включить видео' : 'Выключить видео'}
                </button>
                <button onClick={endCall} className="btn btn-danger">
                    Завершить звонок
                </button>
            </div>
        </div>
    );
}

function PeerVideo({ stream }) {
    const videoRef = useRef();

    useEffect(() => {
        if (!videoRef.current || !stream) return;

        videoRef.current.srcObject = stream;

        return () => {
            if (videoRef.current) {
                videoRef.current.srcObject = null;
            }
        };
    }, [stream]);

    return (
        <div className="video-item">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                className="video-peer"
            />
            <div className="user-name">Участник</div>
        </div>
    );
}

export default VideoCall;
