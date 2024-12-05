import React from 'react';

const ChatContainer = ({ messages }) => {
    return (
        <div className="chat-container p-3" style={{ height: 'calc(100vh - 50px - 56px)' }}>
            {messages.length ? (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className={`chat-bubble ${message.self ? 'self' : 'other'}`}
                    >
                        {message.text}
                    </div>
                ))
            ) : (
                <div className="text-muted">No messages yet.</div>
            )}
        </div>
    );
};

export default ChatContainer;
