import React from 'react';

const ChatContainer = ({ messages }) => {
    return (
        <div className="chat-container p-3" style={{ flexGrow: 1, overflowY: 'auto' }}>
            {messages.length > 0 ? (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className={`chat-bubble ${message.self ? 'self' : 'other'}`}
                        style={{ marginBottom: '10px' }}
                    >
                        {message.text}
                    </div>
                ))
            ) : (
                <div className="text-muted text-center">No messages yet.</div>
            )}
        </div>
    );
};

export default ChatContainer;
