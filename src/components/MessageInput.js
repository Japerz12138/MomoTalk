import React, { useRef, useState } from 'react';

const MessageInput = ({ input, onInputChange, onSendMessage, isMobile, onToggleEmojiPanel, imageQueue = [], onAddImageToQueue, onRemoveImageFromQueue }) => {
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
            alert(`You can only select up to ${maxImages} images at a time. Please remove some images first.`);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }
        
        // Limit the number of files to the remaining slots
        const filesToAdd = files.slice(0, remainingSlots);
        
        if (files.length > remainingSlots) {
            alert(`You can only add ${remainingSlots} more image(s). ${files.length - remainingSlots} image(s) were not added.`);
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
                                    <span className="text-white" style={{ fontSize: '0.75rem' }}>Uploading...</span>
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
                                title="Remove image"
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
                    title="Upload image"
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
                    title="Emoji"
                    style={{ position: 'relative' }}
                >
                    <i className="bi bi-emoji-smile"></i>
                </button>
                <button
                    className="btn btn-outline-secondary emoji-btn"
                    type="button"
                    onClick={onToggleEmojiPanel}
                    title="Favorite emojis"
                >
                    <i className="bi bi-star-fill"></i>
                </button>
                <input
                    ref={inputRef}
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
                    onClick={handleSend}
                    style={{
                        backgroundColor: '#4C5B6F',
                        border: 'none',
                        color: 'white',
                    }}
                    disabled={!onSendMessage || !hasContent}
                >
                    Send
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
