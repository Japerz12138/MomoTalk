import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR } from '../constants';
import { getFullImageUrl } from '../utils/imageHelper';

function MessageList({ messages, groups = [], onSelectMessage, onSelectGroup, unreadMessagesCount }) {
    const { t } = useTranslation();
    const [selectedMessageId, setSelectedMessageId] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectMessage = (msg) => {
        setSelectedMessageId(msg.id);
        setSelectedGroupId(null);
        onSelectMessage(msg);
    };

    const handleSelectGroup = (group) => {
        setSelectedGroupId(group.id);
        setSelectedMessageId(null);
        if (onSelectGroup) onSelectGroup(group);
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

    //Sort the message: multi-device first, then by timestamp
    const sortedMessages = [...messages].sort((a, b) => {
        if (a.isSelf !== b.isSelf) {
            return a.isSelf ? -1 : 1; // Multi-device first
        }
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Most recent first
    });

    //Sort groups by last message time
    const sortedGroups = [...groups].sort((a, b) => {
        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.created_at ? new Date(a.created_at).getTime() : 0);
        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.created_at ? new Date(b.created_at).getTime() : 0);
        return timeB - timeA;
    });

    // Filter messages and groups based on search query
    const filteredMessages = sortedMessages.filter((msg) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const nickname = (msg.nickname || '').toLowerCase();
        const username = (msg.username || '').toLowerCase();
        const text = (msg.text || '').toLowerCase();
        
        return nickname.includes(query) || username.includes(query) || text.includes(query);
    });

    const filteredGroups = sortedGroups.filter((group) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const name = (group.name || '').toLowerCase();
        return name.includes(query);
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

            {/* Messages and groups list */}
            <div className="list-group" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {/* Groups */}
                {filteredGroups.map((group) => (
                    <div
                        key={`group_${group.id}`}
                        className={`list-group-item d-flex align-items-center ${
                            group.id === selectedGroupId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectGroup(group)}
                        style={{ 
                            cursor: 'pointer',
                            borderLeft: group.id === selectedGroupId ? '3px solid #4C5B6F' : undefined
                        }}
                    >
                        <div style={{ 
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#e9ecef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            flexShrink: 0
                        }}>
                            <i className="bi bi-people" style={{ fontSize: '18px', color: '#6c757d' }}></i>
                        </div>
                        <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                            <div className="d-flex justify-content-between align-items-center" style={{ gap: '8px' }}>
                                <strong 
                                    title={group.name}
                                    style={{ 
                                        overflow: 'hidden', 
                                        textOverflow: 'ellipsis', 
                                        whiteSpace: 'nowrap',
                                        flex: '1 1 auto',
                                        minWidth: 0
                                    }}
                                >
                                    {truncateNickname(group.name)}
                                </strong>
                                <small style={{ whiteSpace: 'nowrap' }}>{formatDate(group.lastMessageTime)}</small>
                            </div>
                            <p className="mb-0 text-muted" style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                {group.imageUrl && group.lastMessage ? (
                                    <span>
                                        <i className="bi bi-image"></i> {group.lastMessage.length > 8 ? `${group.lastMessage.slice(0, 8)}...` : group.lastMessage}
                                    </span>
                                ) : group.imageUrl ? (
                                    <span><i className="bi bi-image"></i> {t('messageList.image')}</span>
                                ) : group.lastMessage ? (
                                    group.lastMessage.length > 10 ? `${group.lastMessage.slice(0, 10)}...` : group.lastMessage
                                ) : (
                                    t('messageList.noMessagesYet')
                                )}
                            </p>
                        </div>
                    </div>
                ))}
                {filteredMessages.length > 0 ? (
                    filteredMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`list-group-item d-flex align-items-center ${
                            msg.id === selectedMessageId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectMessage(msg)}
                        style={{ 
                            cursor: 'pointer',
                            backgroundColor: msg.isSelf ? (msg.id === selectedMessageId ? '#e7f3ff' : '#f8f9fa') : undefined,
                            borderLeft: msg.isSelf ? (msg.id === selectedMessageId ? '3px solid #4C5B6F' : '3px solid transparent') : undefined
                        }}
                    >
                        <div style={{ position: 'relative' }}>
                            {msg.isSelf ? (
                                <div style={{ 
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: '50%',
                                    backgroundColor: '#e9ecef',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    marginRight: '12px',
                                    flexShrink: 0
                                }}>
                                    <i className="bi bi-box-arrow-up-right" style={{ fontSize: '18px', color: '#6c757d' }}></i>
                                </div>
                            ) : (
                                <>
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
                                </>
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
                                        minWidth: 0,
                                        color: msg.isSelf ? '#6c757d' : undefined
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
            ) : sortedMessages.length === 0 && groups.length === 0 ? (
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

