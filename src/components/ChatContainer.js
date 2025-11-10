import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DEFAULT_AVATAR } from '../constants';
import MessageInput from './MessageInput';
import { getFullImageUrl } from '../utils/imageHelper';

const ChatContainer = ({ messages, currentChat, friend, onBack, isMobile, input, onInputChange, onSendMessage, onImageUpload, onToggleEmojiPanel }) => {
    const chatEndRef = useRef(null);
    const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
    const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
    const [fullImageView, setFullImageView] = useState(null);
    const [savingEmoji, setSavingEmoji] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);

    const scrollToBottom = () => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'auto' });
        }
    };

    // Scroll to bottom when messages change
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Scroll to bottom immediately when entering a chat (friend changes)
    useEffect(() => {
        // Use setTimeout to ensure DOM is fully rendered
        const timer = setTimeout(() => {
            scrollToBottom();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [friend]);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const handleSaveFavoriteEmoji = async (imageUrl, e) => {
        e.stopPropagation();
        setSavingEmoji(true);
        
        try {
            const token = localStorage.getItem('token');
            await axios.post(
                `${process.env.REACT_APP_SERVER_DOMAIN}/emojis/favorite`,
                { imageUrl },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            alert('Emoji added to favorites!');
        } catch (err) {
            console.error('Error saving emoji:', err);
            if (err.response?.status === 409) {
                alert('This emoji is already in your favorites!');
            } else {
                alert('Failed to save emoji to favorites');
            }
        } finally {
            setSavingEmoji(false);
        }
    };

    // Drag and drop handlers
    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        // Only hide overlay if we're leaving the main container
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        // If mouse is outside the container bounds, hide the overlay
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Keep showing the overlay while dragging over
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        
        if (files && files.length > 0) {
            const file = files[0];
            
            // Check if it's an image
            if (!file.type.startsWith('image/')) {
                alert('Please drop an image file');
                return;
            }

            // Check file size (5MB max)
            if (file.size > 5 * 1024 * 1024) {
                alert('Image size must be less than 5MB');
                return;
            }

            // Upload image
            setUploading(true);
            try {
                const token = localStorage.getItem('token');
                const formData = new FormData();
                formData.append('image', file);

                const response = await axios.post(
                    `${process.env.REACT_APP_SERVER_DOMAIN}/upload/chat-image`,
                    formData,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'multipart/form-data'
                        }
                    }
                );

                if (response.data.imageUrl && onImageUpload) {
                    onImageUpload(response.data.imageUrl);
                }
            } catch (error) {
                console.error('Error uploading image:', error);
                alert(error.response?.data?.error || 'Failed to upload image');
            } finally {
                setUploading(false);
            }
        }
    };

    return (
        <div style={{ 
            height: isMobile ? '100vh' : 'calc(100vh - 60px)', 
            display: 'flex', 
            flexDirection: 'column',
            position: 'relative'
        }}>
            <div
                className={`chat-container ${isMobile ? 'mobile-chat-container' : 'p-3'}`}
                style={{ 
                    marginTop: isMobile ? '0' : 'var(--header-height, 69px)', 
                    overflowY: 'auto', 
                    flex: 1,
                    position: 'relative'
                }}
                onDragEnter={handleDragEnter}
                onDragLeave={handleDragLeave}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
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
                                {message.imageUrl && (
                                    <div
                                        style={{ position: 'relative', display: 'inline-block' }}
                                        onMouseEnter={() => setHoveredImageIndex(index)}
                                        onMouseLeave={() => setHoveredImageIndex(null)}
                                    >
                                        <img 
                                            src={getFullImageUrl(message.imageUrl)} 
                                            alt="chat" 
                                            style={{ 
                                                maxWidth: '300px', 
                                                maxHeight: '300px', 
                                                borderRadius: '8px',
                                                cursor: 'pointer',
                                                display: 'block',
                                                marginBottom: message.text ? '8px' : '0'
                                            }}
                                            onClick={() => setFullImageView(getFullImageUrl(message.imageUrl))}
                                        />
                                        {hoveredImageIndex === index && !savingEmoji && (
                                            <button
                                                className="btn btn-sm star-favorite-btn"
                                                onClick={(e) => handleSaveFavoriteEmoji(message.imageUrl, e)}
                                                style={{
                                                    position: 'absolute',
                                                    top: '8px',
                                                    right: '8px',
                                                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                                    border: '1px solid #dee2e6',
                                                    borderRadius: '50%',
                                                    width: '36px',
                                                    height: '36px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    padding: 0,
                                                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                                                    transition: 'all 0.2s',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => {
                                                    e.currentTarget.style.backgroundColor = '#4C5B6F';
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                    e.currentTarget.querySelector('i').style.color = 'white';
                                                }}
                                                onMouseLeave={(e) => {
                                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                    e.currentTarget.querySelector('i').style.color = '#4C5B6F';
                                                }}
                                                title="Add to favorites"
                                            >
                                                <i className="bi bi-star-fill" style={{ fontSize: '1rem', color: '#4C5B6F' }}></i>
                                            </button>
                                        )}
                                    </div>
                                )}
                                {message.text && <div>{message.text}</div>}
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


                {/* Uploading Overlay */}
                {uploading && (
                    <div
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            zIndex: 1000
                        }}
                    >
                        <div className="spinner-border text-light mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                            <span className="visually-hidden">Uploading...</span>
                        </div>
                        <div style={{ color: 'white', fontSize: '1.2rem' }}>
                            Uploading image...
                        </div>
                    </div>
                )}
            </div>

            {/* Drag and Drop Overlay */}
            {isDragging && (
                <div
                    className="drag-drop-overlay"
                    style={{
                        position: 'fixed',
                        top: isMobile ? '80px' : 'calc(var(--header-height, 69px) + 20px)',
                        left: isMobile ? '20px' : 'calc(550px + 20px)',
                        right: '20px',
                        bottom: isMobile ? '100px' : '80px',
                        backgroundColor: 'rgba(255, 107, 157, 0.15)',
                        border: '4px dashed #FF6B9D',
                        borderRadius: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 9999,
                        pointerEvents: 'none'
                    }}
                >
                    <i 
                        className="bi bi-cloud-upload" 
                        style={{ 
                            fontSize: '5rem', 
                            color: '#FF6B9D',
                            marginBottom: '20px'
                        }}
                    ></i>
                    <div style={{ 
                        color: '#FF6B9D', 
                        fontSize: '1.8rem', 
                        fontWeight: 'bold',
                        marginBottom: '10px'
                    }}>
                        Drop image here to send
                    </div>
                    <div style={{ 
                        color: '#FF6B9D', 
                        fontSize: '1.1rem',
                        fontWeight: '500'
                    }}>
                        Maximum size: 5MB
                    </div>
                </div>
            )}
            
            {/* Message Input for Mobile */}
            {isMobile && (
                <MessageInput
                    input={input}
                    onInputChange={onInputChange}
                    onSendMessage={onSendMessage}
                    onImageUpload={onImageUpload}
                    onToggleEmojiPanel={onToggleEmojiPanel}
                    isMobile={true}
                />
            )}

            {/* Full Image View Modal */}
            {fullImageView && (
                <div
                    className="modal fade show"
                    tabIndex="-1"
                    style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.9)' }}
                    onClick={() => setFullImageView(null)}
                >
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
                        <img 
                            src={fullImageView} 
                            alt="Full view" 
                            style={{ 
                                width: '100%', 
                                height: 'auto',
                                maxHeight: '90vh',
                                objectFit: 'contain'
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatContainer;
