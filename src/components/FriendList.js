import React, { useState } from 'react';
import { DEFAULT_AVATAR } from '../constants';
import { getFullImageUrl } from '../utils/imageHelper';

const FriendList = ({ friends, onSelectFriend }) => {
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleSelectFriend = (friend) => {
        setSelectedFriendId(friend.id);
        onSelectFriend(friend);
    };

    // Filter friends based on search query
    const filteredFriends = friends.filter((friend) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const nickname = (friend.nickname || '').toLowerCase();
        const username = (friend.username || '').toLowerCase();
        const signature = (friend.signature || '').toLowerCase();
        
        return nickname.includes(query) || username.includes(query) || signature.includes(query);
    });

    // Calculate online and total friends count
    const onlineFriendsCount = friends.filter(friend => friend.isOnline).length;
    const totalFriendsCount = friends.length;

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
                        placeholder="Search friends..."
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
                {/* Friends count indicator */}
                {totalFriendsCount > 0 && (
                    <div style={{ 
                        marginTop: '8px', 
                        fontSize: '0.85rem', 
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#28a745',
                                borderRadius: '50%',
                                display: 'inline-block',
                                flexShrink: 0
                            }}
                        ></span>
                        <span>
                            {onlineFriendsCount}/{totalFriendsCount} online
                        </span>
                    </div>
                )}
            </div>

            {/* Friends list */}
            <div className="list-group" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                    <button
                        key={friend.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center ${
                            friend.id === selectedFriendId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectFriend(friend)}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={getFullImageUrl(friend.avatar || DEFAULT_AVATAR)}
                                alt={friend.nickname || friend.username}
                                className="rounded-circle me-2"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            {friend.isOnline && (
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
                        <div className="flex-grow-1 text-start" style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                <strong>{friend.nickname || friend.username}</strong>
                            </div>
                            {friend.signature && (
                                <div style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#6c757d', 
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%'
                                }}>
                                    {friend.signature}
                                </div>
                            )}
                        </div>
                    </button>
                ))
            ) : friends.length === 0 ? (
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
                    <i className="bi bi-plus-circle-dotted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>Time to add some friends!</div>
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
                    <div style={{ marginTop: '10px' }}>No friends found matching "{searchQuery}"</div>
                </div>
            )}
            </div>
        </div>
    );

};

export default FriendList;
