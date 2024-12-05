import React from 'react';
import styles from '../styles';
import '../App.css';

function MessageList({ messages }) {
    return (
        <div style={styles.chatBox}>
            {messages.map((msg) => (
                <p key={msg.id} style={styles.message}>
                    <strong>{msg.username}</strong>: {msg.text}
                    <small>({new Date(msg.timestamp).toLocaleString()})</small>
                </p>
            ))}
            <p></p>
        </div>
    );
}

export default MessageList;