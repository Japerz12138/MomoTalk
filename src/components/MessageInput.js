import React from 'react';

const MessageInput = ({ input, onInputChange, onSendMessage }) => {
    return (
        <div className="chat-input">
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message"
                    value={input}
                    onChange={onInputChange}
                />
                <button
                    className="btn"
                    type="button"
                    onClick={onSendMessage}
                    style={{
                        backgroundColor: '#4C5B6F',
                        border: 'none',
                        color: 'white',
                    }}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default MessageInput;
