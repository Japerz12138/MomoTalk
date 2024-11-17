import React from 'react';
import styles from '../styles';

function MessageList({ messages }) {
    return (
        <div style={styles.chatBox}>
            {messages.map((msg) => (
                <p key={msg.id} style={styles.message}>
                    <strong>{msg.username}</strong>: {msg.text} <small>({new Date(msg.timestamp).toLocaleString()})</small>
                </p>
            ))}
        </div>
    );
}

export default MessageList;
