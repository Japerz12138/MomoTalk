import React from 'react';

function MessageList({ messages }) {
    return (
        <div className="list-group">
            {messages.map((msg) => (
                <div key={msg.id} className="list-group-item">
                    <div className="d-flex justify-content-between align-items-center">
                        <strong>{msg.username}</strong>
                        <small>{new Date(msg.timestamp).toLocaleString()}</small>
                    </div>
                    <p className="mb-0">{msg.text}</p>
                </div>
            ))}
        </div>
    );
}

export default MessageList;
