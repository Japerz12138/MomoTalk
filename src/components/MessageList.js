import React from 'react';

function MessageList({ messages, onSelectMessage }) {
    return (
        <div className="list-group" style={{ marginTop: '69px' }}>
            {messages.map((msg) => (
                <div
                    key={msg.id}
                    className="list-group-item"
                    onClick={() => onSelectMessage(msg)}
                    style={{ cursor: 'pointer' }}
                >
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
