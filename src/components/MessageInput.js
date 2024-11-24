import React from 'react';
import styles from '../styles';

function MessageInput({ input, onInputChange, onSendMessage }) {
    return (
        <form onSubmit={onSendMessage} style={styles.form}>
            <input
                type="text"
                value={input}
                onChange={onInputChange}
                style={styles.input}
                placeholder="Type a message..."
            />
            <button type="submit" style={styles.button}>Send</button>
        </form>
    );
}

export default MessageInput;