import React, { useEffect, useRef } from 'react';

const ChatContainer = ({ messages, currentChat }) => {
    const chatEndRef = useRef(null);
    const DEFAULT_AVATAR = "https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg";

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div
            className="chat-container p-3"
            style={{ marginTop: '69px', overflowY: 'auto', height: 'calc(100vh - 150px)' }}
        >
            <h5 className="text-center text-muted mb-3">{'Chat with @' + currentChat || 'Select a conversation'}</h5>
            {messages.length > 0 ? (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className={`d-flex ${message.self ? 'justify-content-end' : 'align-items-start'} mb-3`}
                    >
                        {!message.self && (
                            <img
                                src={message.avatar || DEFAULT_AVATAR}
                                alt="avatar"
                                width="40"
                                height="40"
                                className="rounded-circle me-2"
                                style={{objectFit: 'cover', objectPosition: 'center'}}
                            />
                        )}
                        <div className={`chat-bubble ${message.self ? 'self' : 'other'}`}>
                            {message.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-center d-flex flex-column align-items-center">
                    <i className="bi bi-chat-left-heart mb-3" style={{fontSize: '3rem', color: '#6c757d'}}></i>
                    <div className="text-muted">No messages yet. Maybe start with a "Hi"?</div>
                </div>
            )}

            <div ref={chatEndRef}></div>
        </div>
    );
};

export default ChatContainer;
