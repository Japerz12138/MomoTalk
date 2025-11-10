import React, { useState } from 'react';
import { DEFAULT_AVATAR } from '../constants';

const FriendList = ({ friends, onSelectFriend }) => {
    const [selectedFriendId, setSelectedFriendId] = useState(null);

    const handleSelectFriend = (friend) => {
        setSelectedFriendId(friend.id);
        onSelectFriend(friend);
    };

    return (
        <div className="list-group" style={{ marginTop: 'var(--header-height, 69px)', height: 'calc(100vh - var(--header-height, 69px))', position: 'relative' }}>
            {friends.length > 0 ? (
                friends.map((friend) => (
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
                                src={friend.avatar || DEFAULT_AVATAR}
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
                        <div className="flex-grow-1 text-start">
                            <strong>{friend.nickname || friend.username}</strong>
                        </div>
                    </button>
                ))
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
                    <i className="bi bi-plus-circle-dotted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>Time to add some friends!</div>
                </div>
            )}
        </div>
    );

};

export default FriendList;
