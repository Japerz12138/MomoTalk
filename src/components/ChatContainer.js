import React, { useEffect, useRef, useState } from 'react';
import { DEFAULT_AVATAR } from '../constants';
import MessageInput from './MessageInput';

const ChatContainer = ({ messages, currentChat, friend, onBack, isMobile, input, onInputChange, onSendMessage }) => {
    const chatEndRef = useRef(null);
    const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <div
                className={`chat-container ${isMobile ? 'mobile-chat-container' : 'p-3'}`}
            style={{ 
                marginTop: isMobile ? '0' : 'var(--header-height, 69px)', 
                overflowY: 'auto', 
                flex: 1,
                paddingBottom: isMobile ? '80px' : '10px'
            }}
            >
            {isMobile && (
                <div className="mobile-chat-header d-flex align-items-center" style={{ padding: '16px', minHeight: '64px' }}>
                    <button 
                        className="btn btn-link p-0 me-2" 
                        onClick={onBack}
                        style={{ fontSize: '1.5rem', lineHeight: 1 }}
                    >
                        <i className="bi bi-arrow-left"></i>
                    </button>
                    <img
                        src={friend?.avatar || DEFAULT_AVATAR}
                        alt="avatar"
                        width="32"
                        height="32"
                        className="rounded-circle me-2"
                        style={{ 
                            objectFit: 'cover',
                            border: '2px solid rgba(255, 255, 255, 0.5)'
                        }}
                    />
                    <h6 className="mb-0" style={{ fontSize: '1.25rem', lineHeight: 1 }}>{friend?.nickname || 'Unknown'}</h6>
                </div>
            )}
            {!isMobile && (
                <h5 className="text-center text-muted mb-3">{'Chat with ' + currentChat || 'Select a conversation'}</h5>
            )}
            {messages.length > 0 ? (
                messages.map((message, index) => (
                    <div
                        key={index}
                        className="message-wrapper mb-3"
                        onMouseEnter={() => setHoveredMessageIndex(index)}
                        onMouseLeave={() => setHoveredMessageIndex(null)}
                        style={{ position: 'relative' }}
                    >
                        <div
                            className={`d-flex ${message.self ? 'justify-content-end' : 'align-items-start'}`}
                        >
                            {!message.self && (
                                <img
                                    src={message.avatar || DEFAULT_AVATAR}
                                    alt="avatar"
                                    width="40"
                                    height="40"
                                    className="rounded-circle me-2"
                                    style={{ objectFit: 'cover', objectPosition: 'center' }}
                                />
                            )}
                            <div className={`chat-bubble ${message.self ? 'self' : 'other'}`}>
                                {message.text}
                            </div>
                        </div>
                        {hoveredMessageIndex === index && (
                            <div
                                className="timestamp text-muted"
                                style={{
                                    position: 'absolute',
                                    bottom: '-20px',
                                    fontSize: '0.75rem',
                                    textAlign: message.self ? 'right' : 'left',
                                    left: message.self ? 'auto' : '50px',
                                    right: message.self ? '10px' : 'auto',
                                }}
                            >
                                {formatTimestamp(message.timestamp)}
                            </div>
                        )}
                    </div>
                ))
            ) : (
                <div className="text-center d-flex flex-column align-items-center">
                    <i className="bi bi-chat-left-heart mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <div className="text-muted">No messages yet. Maybe start with a "Hi"?</div>
                </div>
            )}

                <div ref={chatEndRef}></div>
            </div>
            
            {/* Message Input for Mobile */}
            {isMobile && (
                <MessageInput
                    input={input}
                    onInputChange={onInputChange}
                    onSendMessage={onSendMessage}
                    isMobile={true}
                />
            )}
        </div>
    );
};

export default ChatContainer;
