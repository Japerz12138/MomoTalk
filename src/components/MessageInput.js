import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const MessageInput = ({ input, onInputChange, onSendMessage, isMobile, onToggleEmojiPanel, imageQueue = [], onAddImageToQueue, onRemoveImageFromQueue, replyTo, onCancelReply }) => {
    const { t } = useTranslation();
    const fileInputRef = useRef(null);
    const inputRef = useRef(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    // Common emojis
    const commonEmojis = [
         '😀', '😃', '😄', '😁', '😆',
         '😅', '😂', '🤣', '😊', '😇', 
         '🙂', '🙃', '😉', '😌', '😍', 
         '🥰', '😘', '😗', '😙', '😚', 
         '😋', '😛', '😝', '😜', '🤪', 
         '🤨', '🧐', '🤓', '😎', '🤩', 
         '🥳', '😏', '😒', '😞', '😔', 
         '😟', '😕', '🙁', '😣', '😖', 
         '😫', '😩', '🥺', '😢', '😭', 
         '😤', '😠', '😡', '🤬', '🤯', 
         '😳', '🥵', '🥶', '😱', '😨', 
         '😰', '😥', '😓', '🤗', '🤔', 
         '🤭', '🤫', '🤥', '😶', '😐',
         '😑', '😬', '🙄', '😯', '😦',
         '😧', '😮', '😲', '🥱', '😴',
         '🤤', '😪', '😵', '🤐', '🥴',
         '🤢', '🤮', '🤧', '😷', '🤒', 
         '🤕', '🤑', '🤠', '😈', '👿', 
         '👹', '👺', '🤡', '💩', '👻',
         '💀', '☠️', '👽', '👾', '🤖', 
         '🎃', '😺', '😸', '😹', '😻', 
         '😼', '😽', '🙀', '😿', '😾',
         '👀', '👁️', '👂', '👃', '👄',
         '👅', '👆', '👇', '👈', '👉',
         '👊', '👋', '👌', '👍', '👎',
         '👏', '👐'];
    
    const handleEmojiClick = (emoji) => {
        const input = inputRef.current;
        if (input) {
            const start = input.selectionStart || 0;
            const end = input.selectionEnd || 0;
            const newValue = input.value.substring(0, start) + emoji + input.value.substring(end);
            onInputChange({ target: { value: newValue } });
            setTimeout(() => {
                input.focus();
                input.setSelectionRange(start + emoji.length, start + emoji.length);
            }, 0);
        }
        setShowEmojiPicker(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && onSendMessage) {
            handleSend(e);
        }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        
        // Check total count limit (max 10 images)
        const maxImages = 10;
        const currentCount = imageQueue.length;
        const remainingSlots = maxImages - currentCount;
        
        if (remainingSlots <= 0) {
            alert(t('toast.maxImagesError', { max: maxImages }));
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }
        
        // Limit the number of files to the remaining slots
        const filesToAdd = files.slice(0, remainingSlots);
        
        if (files.length > remainingSlots) {
            alert(t('toast.maxImagesError', { max: remainingSlots }));
        }
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Add each file to queue
        if (onAddImageToQueue) {
            for (const file of filesToAdd) {
                await onAddImageToQueue(file);
            }
        }
    };

    const handleRemoveImage = (imageId) => {
        if (onRemoveImageFromQueue) {
            onRemoveImageFromQueue(imageId);
        }
    };

    const handleSend = (e) => {
        if (onSendMessage) {
            // Pass image queue to send handler
            const imageUrls = imageQueue.filter(item => item.imageUrl).map(item => item.imageUrl);
            onSendMessage(e, imageUrls);
        }
    };

    const hasContent = input.trim() || imageQueue.length > 0;

    return (
        <div className={`chat-input ${isMobile ? 'mobile-chat-input' : ''}`}>
            {replyTo && (
                <div style={{
                    position: 'fixed',
                    bottom: isMobile ? '60px' : '60px',
                    left: isMobile ? '0' : '380px',
                    right: '0',
                    padding: '8px 10px',
                    backgroundColor: 'rgba(248, 249, 250, 0.8)',
                    backdropFilter: 'blur(4px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    zIndex: isMobile ? 1101 : 1001
                }}>
                    <div style={{
                        flex: 1,
                        padding: '6px 10px',
                        backgroundColor: 'rgba(76, 91, 111, 0.1)',
                        borderRadius: '6px',
                        borderLeft: '3px solid rgba(76, 91, 111, 0.5)',
                        fontSize: '0.85rem',
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <i className="bi bi-reply" style={{ fontSize: '0.9rem', color: '#4C5B6F', flexShrink: 0 }}></i>
                        <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {replyTo.imageUrl && <span>[Image]</span>}
                            {replyTo.text && <span>{replyTo.text}</span>}
                        </div>
                    </div>
                    <button
                        onClick={onCancelReply}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.2rem',
                            color: '#6c757d',
                            padding: '4px 8px',
                            borderRadius: '4px',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
                            e.currentTarget.style.color = '#dc3545';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#6c757d';
                        }}
                        title="Cancel reply"
                    >
                        ×
                    </button>
                </div>
            )}
            {imageQueue.length > 0 && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderTop: '1px solid #dee2e6',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px'
                }}>
                    {imageQueue.map((item) => (
                        <div
                            key={item.id}
                            style={{
                                position: 'relative',
                                display: 'inline-block'
                            }}
                        >
                            <img 
                                src={item.preview} 
                                alt="Preview" 
                                style={{ 
                                    maxWidth: '100px', 
                                    maxHeight: '100px', 
                                    objectFit: 'contain',
                                    borderRadius: '8px',
                                    border: '1px solid #dee2e6'
                                }} 
                            />
                            {item.uploading && (
                                <div style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '8px'
                                }}>
                                    <span className="text-white" style={{ fontSize: '0.75rem' }}>{t('toast.uploading')}</span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => handleRemoveImage(item.id)}
                                style={{
                                    position: 'absolute',
                                    top: '-8px',
                                    right: '-8px',
                                    width: '24px',
                                    height: '24px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.75rem',
                                    padding: 0
                                }}
                                title={t('messageInput.removeImage')}
                            >
                                ×
                            </button>
                        </div>
                    ))}
                </div>
            )}
            <div className="input-group">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    multiple
                    style={{ display: 'none' }}
                />
                <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    title={t('messageInput.uploadImage')}
                    style={{
                        borderTopLeftRadius: '0.375rem',
                        borderBottomLeftRadius: '0.375rem'
                    }}
                >
                    <i className="bi bi-image"></i>
                </button>
                <button
                    className="btn btn-outline-secondary emoji-btn"
                    type="button"
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                    title={t('messageInput.emoji')}
                    style={{ position: 'relative' }}
                >
                    <i className="bi bi-emoji-smile"></i>
                </button>
                <button
                    className="btn btn-outline-secondary emoji-btn"
                    type="button"
                    onClick={onToggleEmojiPanel}
                    title={t('messageInput.favoriteEmojis')}
                >
                    <i className="bi bi-star-fill"></i>
                </button>
                <input
                    ref={inputRef}
                    type="text"
                    className="form-control"
                    placeholder={t('messageInput.typeYourMessage')}
                    value={input}
                    onChange={onInputChange}
                    onKeyDown={handleKeyPress}
                />
                <button
                    className="btn"
                    type="button"
                    onClick={handleSend}
                    style={{
                        backgroundColor: '#4C5B6F',
                        border: 'none',
                        color: 'white',
                    }}
                    disabled={!onSendMessage || !hasContent}
                >
                    {t('messageInput.send')}
                    </button>
            </div>
            {showEmojiPicker && (
                <>
                    <div 
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 1198,
                            backgroundColor: 'transparent'
                        }}
                        onClick={() => setShowEmojiPicker(false)}
                    />
                    <div style={{
                        position: 'fixed',
                        bottom: isMobile ? '90px' : '70px',
                        left: isMobile ? '10px' : '438px',
                        width: isMobile ? 'calc(100% - 20px)' : '340px',
                        maxWidth: '340px',
                        maxHeight: '320px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
                        zIndex: 1199,
                        padding: '12px',
                        overflowY: 'auto',
                        overflowX: 'hidden',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(8, 1fr)',
                        gap: '6px',
                        boxSizing: 'border-box'
                    }}>
                        {commonEmojis.map((emoji, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleEmojiClick(emoji);
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '22px',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    borderRadius: '6px',
                                    transition: 'all 0.2s',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    minHeight: '36px',
                                    width: '100%',
                                    maxWidth: '100%',
                                    boxSizing: 'border-box',
                                    overflow: 'hidden'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = '#f0f0f0';
                                    e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.transform = 'scale(1)';
                                }}
                                title={emoji}
                            >
                                {emoji}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

export default MessageInput;
