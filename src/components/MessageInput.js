import React from 'react';

const MessageInput = ({ input, onInputChange, onSendMessage, isMobile }) => {

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && onSendMessage) {
            onSendMessage(e);
        }
    };

    return (
        <div className={`chat-input ${isMobile ? 'mobile-chat-input' : ''}`}>
            <div className="input-group">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Type your message"
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={handleKeyPress}
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
                    disabled={!onSendMessage}
                >
                    Send
                </button>
            </div>
        </div>
    );
};

export default MessageInput;
