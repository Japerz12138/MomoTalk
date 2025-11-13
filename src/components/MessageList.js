import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR } from '../constants';
import { getFullImageUrl } from '../utils/imageHelper';

function MessageList({ messages, onSelectMessage, unreadMessagesCount }) {
    const { t } = useTranslation();
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectMessage = (msg) => {
        setSelectedMessageId(msg.id);
        onSelectMessage(msg);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return ''; //IF is new chat, leave time area empty

        const date = new Date(timestamp);
        return (
            date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) +
            ' ' +
            date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        );
    };

    const truncateNickname = (nickname) => {
        return nickname.length > 10 ? `${nickname.slice(0, 10)}...` : nickname;
    };

    //Sort the message with time stamp
    const sortedMessages = [...messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Filter messages based on search query
    const filteredMessages = sortedMessages.filter((msg) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const nickname = (msg.nickname || '').toLowerCase();
        const username = (msg.username || '').toLowerCase();
        const text = (msg.text || '').toLowerCase();
        
        return nickname.includes(query) || username.includes(query) || text.includes(query);
    });

    return (
        <div style={{ marginTop: 'var(--header-height, 69px)', height: 'calc(100vh - var(--header-height, 69px))', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Search bar */}
            <div style={{ padding: '12px', borderBottom: '1px solid #dee2e6', backgroundColor: '#fff', flexShrink: 0 }}>
                <div className="input-group">
                    <span className="input-group-text" style={{ backgroundColor: '#fff', border: '1px solid #ced4da' }}>
                        <i className="bi bi-search"></i>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder={t('messageList.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: '1px solid #ced4da' }}
                    />
                    {searchQuery && (
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{ border: '1px solid #ced4da' }}
                        >
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                </div>
            </div>

            {/* Messages list */}
            <div className="list-group" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`list-group-item d-flex align-items-center ${
                            msg.id === selectedMessageId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectMessage(msg)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={getFullImageUrl(msg.avatar || DEFAULT_AVATAR)}
                                alt={msg.nickname}
                                className="rounded-circle me-2"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            {msg.isOnline && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: '7px',
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#28a745',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 2.5px white',
                                        display: 'block',
                                        flexShrink: 0,
                                    }}
                                ></span>
                            )}
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div className="d-flex justify-content-between align-items-center" style={{ gap: '8px' }}>
                                <strong 
                                    title={msg.nickname}
                                    style={{ 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        flex: '1 1 auto',
                                        minWidth: 0
                                    }}
                                >
                                    {truncateNickname(msg.nickname)}
                                </strong>
                                <div className="d-flex align-items-center" style={{ gap: '8px', flexShrink: 0 }}>
                                    {(unreadMessagesCount[msg.id] || 0) > 0 && (
                                        <span
                                            className="badge bg-danger rounded-pill"
                                            style={{
                                                fontSize: '0.7rem',
                                                minWidth: '18px',
                                                height: '18px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                padding: '0 6px'
                                            }}
                                        >
                                            {unreadMessagesCount[msg.id]}
                                        </span>
                                    )}
                                    <small style={{ whiteSpace: 'nowrap' }}>{formatDate(msg.timestamp)}</small>
                                </div>
                            </div>
                            <p className="mb-0 text-muted" style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                {msg.imageUrl && msg.text ? (
                                    // Image with text: show icon + text preview
                                    <span>
                                        <i className="bi bi-image"></i> {msg.text.length > 8 ? `${msg.text.slice(0, 8)}...` : msg.text}
                                    </span>
                                ) : msg.imageUrl ? (
                                    // Image only
                                    <span><i className="bi bi-image"></i> {t('messageList.image')}</span>
                                ) : msg.text ? (
                                    // Text only
                                    msg.text.length > 10 ? `${msg.text.slice(0, 10)}...` : msg.text
                                ) : (
                                    // No message
                                    t('messageList.noMessagesYet')
                                )}
                            </p>
                        </div>
                    </div>
                ))
            ) : sortedMessages.length === 0 ? (
                <div
                    className="d-flex flex-column align-items-center justify-content-center text-muted"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <i className="bi bi-chat-left-dots" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>{t('messageList.noMessages')}</div>
                </div>
            ) : (
                <div
                    className="d-flex flex-column align-items-center justify-content-center text-muted"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <i className="bi bi-search" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>{t('messageList.noResults', { query: searchQuery })}</div>
                </div>
            )}
            </div>
        </div>
    );

}

export default MessageList;

