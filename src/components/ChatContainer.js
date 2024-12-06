import React, { useEffect, useRef } from 'react';

const ChatContainer = ({ messages, currentChat }) => {
    const chatEndRef = useRef(null);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    return (
        <div className="chat-container p-3" style={{ marginTop: '69px', overflowY: 'auto', height: 'calc(100vh - 150px)' }}>
            <h5 className="text-center text-muted mb-3">{currentChat || 'Select a conversation'}</h5>
            {messages.length > 0 ? (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className={`d-flex ${message.self ? 'justify-content-end' : 'align-items-start'} mb-3`}
                    >
                        {!message.self && (
                            <img
                                src={message.avatar || "https://via.placeholder.com/32"}
                                alt={message.nickname}
                                width="32"
                                height="32"
                                className="rounded-circle me-2"
                            />
                        )}
                        <div className={`chat-bubble ${message.self ? 'self' : 'other'}`}>
                            {message.text}
                        </div>
                    </div>
                ))
            ) : (
                <div className="text-muted text-center">No messages yet.</div>
            )}
            <div ref={chatEndRef}></div>
        </div>
    );
};

export default ChatContainer;
