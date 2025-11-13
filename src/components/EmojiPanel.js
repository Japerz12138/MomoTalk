import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { getFullImageUrl } from '../utils/imageHelper';
import { useTranslation } from 'react-i18next';

const EmojiPanel = ({ onSelectEmoji, onClose, show, isMobile = false }) => {
    const { t } = useTranslation();
    const [favoriteEmojis, setFavoriteEmojis] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (show) {
            fetchFavoriteEmojis();
        }
    }, [show]);

    const fetchFavoriteEmojis = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(
                `${process.env.REACT_APP_SERVER_DOMAIN}/emojis/favorites`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            setFavoriteEmojis(response.data);
        } catch (err) {
            console.error('Error fetching favorite emojis:', err);
            setError(t('toast.failedToLoadFavoriteEmojis'));
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmoji = async (emojiId, e) => {
        e.stopPropagation();
        if (!window.confirm(t('toast.removeEmojiConfirmation'))) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            await axios.delete(
                `${process.env.REACT_APP_SERVER_DOMAIN}/emojis/favorite/${emojiId}`,
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            // Remove from local state
            setFavoriteEmojis(prev => prev.filter(emoji => emoji.id !== emojiId));
        } catch (err) {
            console.error('Error deleting emoji:', err);
            alert(t('toast.failedToDeleteEmoji'));
        }
    };

    const handleSelectEmoji = (imageUrl) => {
        onSelectEmoji(imageUrl);
        onClose();
    };

    if (!show) return null;

    // Calculate panel style based on mobile/desktop
    const panelStyle = isMobile ? {
        position: 'fixed',
        bottom: '80px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '90%',
        maxWidth: '320px',
        maxHeight: '60vh',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    } : {
        position: 'absolute',
        bottom: '70px',
        left: '58px',
        width: '320px',
        maxHeight: '500px',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
    };

    // Backdrop style
    const backdropStyle = isMobile ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1199
    } : {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1199
    };

    return (
        <>
            {/* Backdrop */}
            <div style={backdropStyle} onClick={onClose} />

            {/* Panel */}
            <div style={panelStyle}>
                {/* Header */}
                <div
                    style={{
                        padding: '16px',
                        borderBottom: '1px solid #e0e0e0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        backgroundColor: '#f8f9fa'
                    }}
                >
                    <h6 style={{ margin: 0, fontSize: '1rem', fontWeight: '600' }}>
                        <i className="bi bi-star-fill me-2" style={{ color: '#4C5B6F' }}></i>
                        {t('emojiPanel.favoriteEmojis')}
                    </h6>
                    <button
                        className="btn btn-sm btn-link p-0"
                        onClick={onClose}
                        style={{ fontSize: '1.5rem', lineHeight: 1, color: '#6c757d' }}
                    >
                        <i className="bi bi-x"></i>
                    </button>
                </div>

                {/* Content */}
                <div
                    style={{
                        padding: '12px',
                        overflowY: 'auto',
                        flex: 1
                    }}
                >
                    {loading && (
                        <div className="text-center text-muted p-3">
                            <div className="spinner-border spinner-border-sm me-2" role="status">
                                <span className="visually-hidden">{t('emojiPanel.loading')}</span>
                            </div>
                            {t('emojiPanel.loading')}
                        </div>
                    )}

                    {error && (
                        <div className="alert alert-danger p-2 mb-2" style={{ fontSize: '0.875rem' }}>
                            {error}
                        </div>
                    )}

                    {!loading && !error && favoriteEmojis.length === 0 && (
                        <div className="text-center text-muted p-3">
                            <i className="bi bi-emoji-frown" style={{ fontSize: '2rem', display: 'block', marginBottom: '8px', opacity: 0.5 }}></i>
                            <p style={{ fontSize: '0.875rem', margin: 0 }}>{t('emojiPanel.noFavoriteEmojisYet')}</p>
                            <p style={{ fontSize: '0.75rem', margin: '4px 0 0 0' }}>{t('emojiPanel.hoverTip')}</p>
                        </div>
                    )}

                    {!loading && !error && favoriteEmojis.length > 0 && (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(3, 1fr)',
                                gap: '8px'
                            }}
                        >
                            {favoriteEmojis.map((emoji) => (
                                <div
                                    key={emoji.id}
                                    style={{
                                        position: 'relative',
                                        cursor: 'pointer',
                                        borderRadius: '8px',
                                        overflow: 'hidden',
                                        border: '2px solid transparent',
                                        transition: 'all 0.2s'
                                    }}
                                    className="emoji-item"
                                    onClick={() => handleSelectEmoji(emoji.image_url)}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.borderColor = '#4C5B6F';
                                        e.currentTarget.style.transform = 'scale(1.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.borderColor = 'transparent';
                                        e.currentTarget.style.transform = 'scale(1)';
                                    }}
                                >
                                    <img
                                        src={getFullImageUrl(emoji.image_url)}
                                        alt="emoji"
                                        style={{
                                            width: '100%',
                                            height: '90px',
                                            objectFit: 'cover',
                                            display: 'block'
                                        }}
                                    />
                                    <button
                                        className="btn btn-sm delete-emoji-btn"
                                        onClick={(e) => handleDeleteEmoji(emoji.id, e)}
                                        style={{
                                            position: 'absolute',
                                            top: '4px',
                                            right: '4px',
                                            padding: '2px 6px',
                                            fontSize: '0.75rem',
                                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: '#dc3545',
                                            opacity: 0,
                                            transition: 'opacity 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                        onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <style jsx="true">{`
                .emoji-item:hover .delete-emoji-btn {
                    opacity: 1 !important;
                }
            `}</style>
        </>
    );
};

export default EmojiPanel;

