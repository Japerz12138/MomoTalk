import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DEFAULT_AVATAR } from '../constants';
import MessageInput from './MessageInput';
import { getFullImageUrl } from '../utils/imageHelper';

const ChatContainer = ({ messages, currentChat, friend, onBack, isMobile, input, onInputChange, onSendMessage, onToggleEmojiPanel, imageQueue, onAddImageToQueue, onRemoveImageFromQueue }) => {
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
    const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
    const [fullImageView, setFullImageView] = useState(null);
    const [savingEmoji, setSavingEmoji] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const scrollTimeoutRef = useRef(null);
    const lastScrollHeightRef = useRef(0);

    const scrollToBottom = () => {
        const container = chatContainerRef.current;
        if (container) {
            const currentScrollHeight = container.scrollHeight;
            // Use requestAnimationFrame to ensure DOM is fully updated
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight;
                    // If scrollHeight changed, it means content was added, scroll again
                    if (container.scrollHeight !== currentScrollHeight) {
                        requestAnimationFrame(() => {
                            if (container) {
                                container.scrollTop = container.scrollHeight;
                            }
                        });
                    }
                }
            });
        }
    };

    // Use useLayoutEffect to scroll before browser paint, preventing flash
    useLayoutEffect(() => {
        const container = chatContainerRef.current;
        if (container) {
            // Reset scroll height tracking when messages or friend changes
            lastScrollHeightRef.current = 0;
            scrollToBottom();
            // Also scroll after a short delay to catch images that load after initial render
            const timer = setTimeout(() => {
                scrollToBottom();
                // Update last scroll height after images potentially load
                if (container) {
                    lastScrollHeightRef.current = container.scrollHeight;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [messages, friend]);

    // Handle image load - scroll to bottom after image loads
    // Use debounce to avoid excessive scrolling
    const handleImageLoad = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        
        // Check if scrollHeight has changed (image loaded and rendered)
        const newScrollHeight = container.scrollHeight;
        if (newScrollHeight !== lastScrollHeightRef.current) {
            lastScrollHeightRef.current = newScrollHeight;
            // Clear previous timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            // Debounce scrolling to wait for all images to potentially load
            scrollTimeoutRef.current = setTimeout(() => {
                scrollToBottom();
            }, 50);
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const formatTimestamp = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString();
    };

    const formatDateSeparator = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const diffDays = Math.floor((today - messageDate) / (1000 * 60 * 60 * 24));
        
        const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        if (diffDays === 0) {
            return 'Today ' + time;
        } else if (diffDays === 1) {
            return 'Yesterday ' + time;
        } else if (diffDays < 7) {
            return weekdays[date.getDay()] + ' ' + time;
        } else {
            // Put zh-CN for now, might gonna change it later.
            return date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) + ' ' + time;
        }
    };

    const shouldShowDateSeparator = (currentMessage, previousMessage) => {
        if (!previousMessage) return true;
        const currentDate = new Date(currentMessage.timestamp);
        const previousDate = new Date(previousMessage.timestamp);
        return currentDate.toDateString() !== previousDate.toDateString();
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
        
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        
        if (x <= rect.left || x >= rect.right || y <= rect.top || y >= rect.bottom) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!isDragging) {
            setIsDragging(true);
        }
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files || []);
        
        if (files.length > 0 && onAddImageToQueue) {
            // Filter to only image files
            const imageFiles = files.filter(file => file.type.startsWith('image/'));
            
            if (imageFiles.length === 0) {
                alert('Please drop image files only');
                return;
            }
            
            // Add each image file (addImageToQueue will handle the 10 image limit)
            for (const file of imageFiles) {
                await onAddImageToQueue(file);
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
                ref={chatContainerRef}
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
                        src={getFullImageUrl(friend?.avatar || DEFAULT_AVATAR)}
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
                messages.map((message, index) => {
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const showSeparator = shouldShowDateSeparator(message, previousMessage);
                    
                    return (
                        <React.Fragment key={index}>
                            {showSeparator && (
                                <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    margin: '20px 0',
                                    position: 'relative'
                                }}>
                                    <div style={{
                                        flex: 1,
                                        height: '1px',
                                        backgroundColor: '#e0e0e0',
                                        marginRight: '12px'
                                    }}></div>
                                    <span style={{
                                        padding: '4px 12px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: '12px',
                                        color: '#6c757d',
                                        fontSize: '0.75rem',
                                        fontWeight: 500,
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {formatDateSeparator(message.timestamp)}
                                    </span>
                                    <div style={{
                                        flex: 1,
                                        height: '1px',
                                        backgroundColor: '#e0e0e0',
                                        marginLeft: '12px'
                                    }}></div>
                                </div>
                            )}
                            <div
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
                                            src={getFullImageUrl(message.avatar || DEFAULT_AVATAR)}
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
                                                style={{ 
                                                    position: 'relative', 
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    overflow: 'hidden'
                                                }}
                                                onMouseEnter={() => setHoveredImageIndex(index)}
                                                onMouseLeave={() => setHoveredImageIndex(null)}
                                            >
                                                <img 
                                                    src={getFullImageUrl(message.imageUrl)} 
                                                    alt="chat" 
                                                    style={{ 
                                                        maxWidth: '100%',
                                                        maxHeight: '300px',
                                                        width: 'auto',
                                                        height: 'auto',
                                                        borderRadius: '8px',
                                                        cursor: 'pointer',
                                                        display: 'block',
                                                        marginBottom: message.text ? '8px' : '0',
                                                        objectFit: 'contain'
                                                    }}
                                                    onClick={() => setFullImageView(getFullImageUrl(message.imageUrl))}
                                                    onLoad={handleImageLoad}
                                                    onError={handleImageLoad}
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
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="text-center d-flex flex-column align-items-center">
                    <i className="bi bi-chat-left-heart mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <div className="text-muted">No messages yet. Maybe start with a "Hi"?</div>
                </div>
            )}

                <div ref={chatEndRef}></div>
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
                        Drop image here to add to queue
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
                    onToggleEmojiPanel={onToggleEmojiPanel}
                    isMobile={true}
                    imageQueue={imageQueue}
                    onAddImageToQueue={onAddImageToQueue}
                    onRemoveImageFromQueue={onRemoveImageFromQueue}
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
