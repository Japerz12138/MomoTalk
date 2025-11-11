import React, { useRef } from 'react';

const MessageInput = ({ input, onInputChange, onSendMessage, isMobile, onToggleEmojiPanel, imageQueue = [], onAddImageToQueue, onRemoveImageFromQueue }) => {
    const fileInputRef = useRef(null);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && onSendMessage) {
            handleSend(e);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Use shared addImageToQueue function
        if (onAddImageToQueue) {
            await onAddImageToQueue(file);
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
                    onClick={onToggleEmojiPanel}
                    title="Favorite emojis"
                >
                    <i className="bi bi-star-fill"></i>
                </button>
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
        </div>
    );
};

export default MessageInput;
