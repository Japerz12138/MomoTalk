import React, { useRef, useState } from 'react';
import axios from 'axios';

const MessageInput = ({ input, onInputChange, onSendMessage, onImageUpload, isMobile, onToggleEmojiPanel }) => {
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [previewImage, setPreviewImage] = useState(null);

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && onSendMessage) {
            onSendMessage(e);
        }
    };

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        reader.onloadend = () => {
            setPreviewImage(reader.result);
        };
        reader.readAsDataURL(file);

        // Upload image
        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', file);

            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/upload/chat-image`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.imageUrl && onImageUpload) {
                onImageUpload(response.data.imageUrl);
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.response?.data?.error || 'Failed to upload image');
        } finally {
            setUploading(false);
            setPreviewImage(null);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`chat-input ${isMobile ? 'mobile-chat-input' : ''}`}>
            {previewImage && (
                <div style={{
                    padding: '10px',
                    backgroundColor: '#f8f9fa',
                    borderTop: '1px solid #dee2e6',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                }}>
                    <img src={previewImage} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', objectFit: 'contain' }} />
                    <span className="text-muted">Uploading...</span>
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
                    disabled={uploading}
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
