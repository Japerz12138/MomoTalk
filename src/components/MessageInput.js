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
                <button className="btn btn-primary" type="button" onClick={onSendMessage}>
                    Send
                </button>
            </div>
        </div>
    );
};

export default MessageInput;
