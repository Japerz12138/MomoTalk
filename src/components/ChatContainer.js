import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import axios from 'axios';
import { DEFAULT_AVATAR } from '../constants';
import MessageInput from './MessageInput';
import { getFullImageUrl } from '../utils/imageHelper';
import { useTranslation } from 'react-i18next';

const ChatContainer = ({ messages, currentChat, friend, onBack, isMobile, input, onInputChange, onSendMessage, onToggleEmojiPanel, imageQueue, onAddImageToQueue, onRemoveImageFromQueue, onReply, onDeleteMessage, replyTo, onCancelReply, onAvatarClick, onLoadMoreMessages, hasMoreMessages, isLoadingMoreMessages }) => {
    const chatEndRef = useRef(null);
    const chatContainerRef = useRef(null);
    const { t } = useTranslation();
    const [hoveredMessageIndex, setHoveredMessageIndex] = useState(null);
    const [hoveredImageIndex, setHoveredImageIndex] = useState(null);
    const [fullImageView, setFullImageView] = useState(null);
    const [savingEmoji, setSavingEmoji] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [contextMenu, setContextMenu] = useState(null);
    const scrollTimeoutRef = useRef(null);
    const lastScrollHeightRef = useRef(0);
    const isLoadingRef = useRef(false);
    const prevScrollHeightRef = useRef(0);
    const prevFriendIdRef = useRef(null);
    const prevMessagesLengthRef = useRef(0);
    const oldestMessageIdRef = useRef(null); // Track oldest message ID to detect prepend vs append
    const loadingTimeoutRef = useRef(null); // Track loading timeout to prevent premature scrolling
    const isInitialLoadRef = useRef(false); // Track if this is initial load (need to scroll to bottom after images load)

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
    // Only scroll to bottom when chat changes, not when loading more messages
    useLayoutEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;

        const currentFriendId = friend?.id;
        const friendChanged = prevFriendIdRef.current !== currentFriendId;
        prevFriendIdRef.current = currentFriendId;

        // Only scroll to bottom when switching to a new chat
        if (friendChanged) {
            // Reset all scroll-related tracking when friend changes
            lastScrollHeightRef.current = 0;
            isLoadingRef.current = false;
            prevScrollHeightRef.current = 0;
            prevMessagesLengthRef.current = 0; // Reset so initial load detection works
            oldestMessageIdRef.current = null; // Reset oldest message tracking
            isInitialLoadRef.current = true; // Mark as initial load
            scrollToBottom();
            // Also scroll after multiple delays to catch images that load after initial render
            const timer1 = setTimeout(() => {
                scrollToBottom();
            }, 100);
            const timer2 = setTimeout(() => {
                scrollToBottom();
                // Update last scroll height after images potentially load
                if (container) {
                    lastScrollHeightRef.current = container.scrollHeight;
                }
            }, 500); // Longer delay for images
            const timer3 = setTimeout(() => {
                scrollToBottom();
                // Final check after more time for slow images
                if (container) {
                    lastScrollHeightRef.current = container.scrollHeight;
                    isInitialLoadRef.current = false;
                }
            }, 1000);
            return () => {
                clearTimeout(timer1);
                clearTimeout(timer2);
                clearTimeout(timer3);
            };
        }
    }, [friend]); // Only depend on friend, not messages

    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container || messages.length === 0) {
            prevMessagesLengthRef.current = messages.length;
            oldestMessageIdRef.current = null;
            return;
        }

        const currentOldestMessageId = messages[0]?.id;
        const isPrepending = isLoadingRef.current && 
                            prevScrollHeightRef.current > 0 && 
                            oldestMessageIdRef.current !== null &&
                            currentOldestMessageId !== oldestMessageIdRef.current;

        // If we just loaded more messages, hold scroll position
        if (isPrepending) {
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
            }
            
            //DOM Operation
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        if (container && isLoadingRef.current) {
                            const newScrollHeight = container.scrollHeight;
                            const scrollDiff = newScrollHeight - prevScrollHeightRef.current;
                            container.scrollTop = scrollDiff;
                            
                            // Double-check
                            requestAnimationFrame(() => {
                                if (container && isLoadingRef.current) {
                                    const finalScrollHeight = container.scrollHeight;
                                    const finalScrollDiff = finalScrollHeight - prevScrollHeightRef.current;
                                    container.scrollTop = finalScrollDiff;
                                }
                            });
                            
                            // Keep loading flag for a bit longer
                            loadingTimeoutRef.current = setTimeout(() => {
                                isLoadingRef.current = false;
                                prevScrollHeightRef.current = 0;
                                prevMessagesLengthRef.current = messages.length;
                                oldestMessageIdRef.current = currentOldestMessageId;
                            }, 100);
                        }
                    }, 100);
                });
            });
            return;
        }

        //scroll to bottom
        const isInitialLoad = prevMessagesLengthRef.current === 0 && messages.length > 0;
        
        if (isInitialLoad) {
            isInitialLoadRef.current = true; //Mark as initial load so images will trigger scroll
            prevMessagesLengthRef.current = messages.length;
            oldestMessageIdRef.current = currentOldestMessageId;
            requestAnimationFrame(() => {
                if (container) {
                    container.scrollTop = container.scrollHeight;
                }
            });
            // Also scroll after delays to catch images
            setTimeout(() => {
                if (container && isInitialLoadRef.current) {
                    scrollToBottom();
                }
            }, 200);
            setTimeout(() => {
                if (container && isInitialLoadRef.current) {
                    scrollToBottom();
                    isInitialLoadRef.current = false; // Clear flag after sufficient time
                }
            }, 1000);
            return;
        }

        if (isLoadingRef.current) {
            return;
        }

        const isAppending = oldestMessageIdRef.current !== null &&
                           oldestMessageIdRef.current === currentOldestMessageId && 
                           messages.length > prevMessagesLengthRef.current;
        
        if (isAppending) {
            prevMessagesLengthRef.current = messages.length;
            const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            const isNearBottom = scrollBottom < 300;
            
            if (isNearBottom) {
                // Auto-scroll
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        if (container && !isLoadingRef.current) {
                            container.scrollTop = container.scrollHeight;
                        }
                    });
                });
            }
        } else {
            // Update refs
            prevMessagesLengthRef.current = messages.length;
            if (oldestMessageIdRef.current !== currentOldestMessageId) {
                oldestMessageIdRef.current = currentOldestMessageId;
            }
        }
    }, [messages]);

    // Handle scroll to load more messages
    const handleScroll = () => {
        const container = chatContainerRef.current;
        if (!container || !onLoadMoreMessages || !hasMoreMessages || isLoadingMoreMessages) return;
        if (isLoadingRef.current) return;

        if (container.scrollTop < 100 && messages.length > 0) {
            // Get oldest message id
            const oldestMessage = messages[0];
            if (oldestMessage && oldestMessage.id) {
                isLoadingRef.current = true;
                prevScrollHeightRef.current = container.scrollHeight;
                oldestMessageIdRef.current = oldestMessage.id; //Save current oldest ID
                
                if (loadingTimeoutRef.current) {
                    clearTimeout(loadingTimeoutRef.current);
                }
                
                onLoadMoreMessages(oldestMessage.id);
            }
        }
    };

    // Handle image load - scroll to bottom after image loads
    // Use debounce to avoid excessive scrolling
    const handleImageLoad = () => {
        const container = chatContainerRef.current;
        if (!container) return;
        
        //scroll position hold
        if (isLoadingRef.current) {
            lastScrollHeightRef.current = container.scrollHeight;
            return;
        }
        
        // Check if scrollHeight has changed (image loaded and rendered)
        const newScrollHeight = container.scrollHeight;
        if (newScrollHeight !== lastScrollHeightRef.current) {
            lastScrollHeightRef.current = newScrollHeight;
            // Clear previous timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            
            // Scroll to bottom when images load
            if (isInitialLoadRef.current) {
                scrollTimeoutRef.current = setTimeout(() => {
                    if (container && !isLoadingRef.current) {
                        scrollToBottom();
                    }
                }, 50);
                return;
            }
            
            const scrollBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
            const isNearBottom = scrollBottom < 300;
            
            if (isNearBottom) {
                scrollTimeoutRef.current = setTimeout(() => {
                    if (container && !isLoadingRef.current) {
                        scrollToBottom();
                    }
                }, 50);
            }
        }
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            if (loadingTimeoutRef.current) {
                clearTimeout(loadingTimeoutRef.current);
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
        
        const weekdays = [t('weekdays.sunday'), t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday')];
        const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        
        if (diffDays === 0) {
            return t('dates.today') + ' ' + time;
        } else if (diffDays === 1) {
            return t('dates.yesterday') + ' ' + time;
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
            alert(t('toast.emojiAddedToFavorites'));
        } catch (err) {
            console.error('Error saving emoji:', err);
            if (err.response?.status === 409) {
                alert(t('toast.emojiAlreadyInFavorites'));
            } else {
                alert(t('toast.failedToSaveEmojiToFavorites'));
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
                alert(t('toast.pleaseDropImageFilesOnly'));
                return;
            }
            
            // Add each image file (addImageToQueue will handle the 10 image limit)
            for (const file of imageFiles) {
                await onAddImageToQueue(file);
            }
        }
    };

    const handleContextMenu = (e, message) => {
        e.preventDefault();
        if ((!message.self && onReply) || (message.self && onDeleteMessage)) {
            const menuWidth = 180;
            const menuHeight = 50;
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;
            
            let x = e.clientX;
            let y = e.clientY;
            
            // 如果鼠标在右侧，菜单显示在左侧
            if (x + menuWidth > windowWidth) {
                x = e.clientX - menuWidth;
            }
            
            // 如果鼠标在下侧，菜单显示在上方
            if (y + menuHeight > windowHeight) {
                y = e.clientY - menuHeight;
            }
            
            // 确保菜单不会超出左边界
            if (x < 0) {
                x = 10;
            }
            
            // 确保菜单不会超出上边界
            if (y < 0) {
                y = 10;
            }
            
            setContextMenu({
                x: x,
                y: y,
                message: message
            });
        }
    };

    useEffect(() => {
        const handleClickOutside = () => {
            setContextMenu(null);
        };
        if (contextMenu) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [contextMenu]);


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
                onScroll={handleScroll}
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
                    {friend?.isGroup && !friend?.avatar ? (
                        <div
                            className="rounded-circle me-2"
                            style={{
                                width: '32px',
                                height: '32px',
                                backgroundColor: '#e9ecef',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                border: '2px solid rgba(255, 255, 255, 0.5)'
                            }}
                        >
                            <i className="bi bi-people" style={{ fontSize: '16px', color: '#6c757d' }}></i>
                        </div>
                    ) : (
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
                    )}
                    <h6 className="mb-0" style={{ fontSize: '1.25rem', lineHeight: 1 }}>{friend?.nickname || 'Unknown'}</h6>
                </div>
            )}
            {!isMobile && (
                <h5 className="text-center text-muted mb-3">{t('chat.chatWith', { currentChat: currentChat || t('chat.selectAConversation') })}</h5>
            )}
            {/* Loading indicator for older messages */}
            {isLoadingMoreMessages && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    padding: '10px 0',
                    color: '#6c757d'
                }}>
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <span>{t('chat.loadingMore') || '加载中...'}</span>
                </div>
            )}
            {/* Show "Load more" hint if there are more messages */}
            {hasMoreMessages && !isLoadingMoreMessages && messages.length > 0 && (
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    padding: '10px 0',
                    color: '#adb5bd',
                    fontSize: '0.85rem'
                }}>
                    <span>↑ {t('chat.scrollForMore') || '向上滚动加载更多'}</span>
                </div>
            )}
            {messages.length > 0 ? (
                messages.map((message, index) => {
                    const previousMessage = index > 0 ? messages[index - 1] : null;
                    const showSeparator = shouldShowDateSeparator(message, previousMessage);
                    
                    return (
                        <React.Fragment key={message.id || `msg-${index}`}>
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
                            {(message.messageType === 'system' || (message.senderId === 0 && !message.nickname && !message.avatar)) ? (
                                <div className="message-wrapper mb-3" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: '8px', marginBottom: '8px' }}>
                                    <div style={{
                                        padding: '6px 12px',
                                        backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                        borderRadius: '12px',
                                        color: '#6c757d',
                                        fontSize: '0.85rem',
                                        fontWeight: 400,
                                        textAlign: 'center'
                                    }}>
                                        {message.text || '系统消息'}
                                    </div>
                                </div>
                            ) : (
                                <div
                                    className="message-wrapper mb-3"
                                    onMouseEnter={() => setHoveredMessageIndex(index)}
                                    onMouseLeave={() => setHoveredMessageIndex(null)}
                                    onContextMenu={(e) => handleContextMenu(e, message)}
                                    style={{ position: 'relative', marginTop: friend?.isGroup && !message.self ? '8px' : '0' }}
                                >
                                    <div
                                        className={`d-flex ${message.self ? 'justify-content-end' : 'align-items-start'}`}
                                        style={{ 
                                            maxWidth: '70%',
                                            marginLeft: message.self ? 'auto' : '0'
                                        }}
                                    >
                                        {!message.self && (
                                            <img
                                                src={getFullImageUrl(message.avatar || DEFAULT_AVATAR)}
                                                alt="avatar"
                                                width="40"
                                                height="40"
                                                className="rounded-circle me-2"
                                                style={{ 
                                                    objectFit: 'cover', 
                                                    objectPosition: 'center', 
                                                    flexShrink: 0,
                                                    cursor: 'pointer'
                                                }}
                                                onClick={() => onAvatarClick && onAvatarClick(message.senderId)}
                                            />
                                        )}
                                        <div
                                            className={`d-flex flex-column ${message.self ? 'align-items-end' : 'align-items-start'}`}
                                            style={{ 
                                                flex: 1, 
                                                minWidth: 0,
                                                maxWidth: '100%'
                                            }}
                                        >
                                            {/* Show name */}
                                            {friend?.isGroup && !message.self && message.nickname && (
                                                <div style={{
                                                    fontSize: '0.9rem',
                                                    color: '#495A6E',
                                                    marginBottom: '4px',
                                                    fontWeight: 500,
                                                    lineHeight: '1.2'
                                                }}>
                                                    {message.nickname}
                                                </div>
                                            )}
                                            <div className={`chat-bubble ${message.self ? 'self' : 'other'}`} style={{ position: 'relative', width: 'fit-content', maxWidth: '100%' }}>
                                        {message.replyTo && (
                                            <div style={{
                                                padding: '8px',
                                                marginBottom: '8px',
                                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                                                borderRadius: '4px',
                                                borderLeft: '3px solid #FFFFFF',
                                                fontSize: '0.85rem',
                                                color: '#FFFFFF'
                                            }}>
                                                {message.replyTo.imageUrl && <div>[Image]</div>}
                                                {message.replyTo.text && <div>{message.replyTo.text}</div>}
                                            </div>
                                        )}
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
                                                        maxHeight: message.isEmoji === true ? '120px' : '300px',
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
                                </div>
                                {hoveredMessageIndex === index && message.messageType !== 'system' && (
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
                            )}
                        </React.Fragment>
                    );
                })
            ) : (
                <div className="text-center d-flex flex-column align-items-center">
                    <i className="bi bi-chat-left-heart mb-3" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                    <div className="text-muted">{t('chat.noMessagesYet')}</div>
                    <div className="text-muted">{t('chat.maybeStartWithAHi')}</div>
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
                        {t('imageUpload.dropTheImageHere')}
                    </div>
                    <div style={{ 
                        color: '#FF6B9D', 
                        fontSize: '1.1rem',
                        fontWeight: '500'
                    }}>
                        {t('imageUpload.maximumFileSize')}
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
                    replyTo={replyTo}
                    onCancelReply={onCancelReply}
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

            {/* Context Menu */}
            {contextMenu && (
                <div
                    className="dropdown-menu show"
                    style={{
                        position: 'fixed',
                        top: `${contextMenu.y}px`,
                        left: `${contextMenu.x}px`,
                        zIndex: 10000,
                        display: 'block'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {!contextMenu.message.self && onReply && (
                        <button
                            className="dropdown-item"
                            onClick={() => {
                                onReply(contextMenu.message);
                                setContextMenu(null);
                            }}
                        >
                            <i className="bi bi-reply me-2"></i>
                            {t('chat.reply')}
                        </button>
                    )}
                    {contextMenu.message.self && onDeleteMessage && (
                        <button
                            className="dropdown-item text-danger"
                            onClick={() => {
                                onDeleteMessage(contextMenu.message);
                                setContextMenu(null);
                            }}
                        >
                            <i className="bi bi-backspace-reverse me-2"></i>
                            {t('chat.withdraw')}
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default ChatContainer;
