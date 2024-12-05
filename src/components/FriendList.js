import React, { useState } from 'react';

const FriendList = ({ friends, onSelectFriend }) => {
    const [selectedFriendId, setSelectedFriendId] = useState(null);

    const handleSelectFriend = (friend) => {
        setSelectedFriendId(friend.id);
        onSelectFriend(friend);
    };

    return (
        <div className="list-group" style={{ marginTop: '69px', width: '300px' }}>
            {friends.map((friend) => (
                <button
                    key={friend.id}
                    type="button"
                    className={`list-group-item list-group-item-action d-flex align-items-center ${
                        friend.id === selectedFriendId ? 'active' : ''
                    }`}
                    onClick={() => handleSelectFriend(friend)}
                >
                    <img
                        src={friend.avatar || 'https://via.placeholder.com/32'}
                        alt={friend.nickname || friend.username}
                        className="rounded-circle me-2"
                        style={{ width: '32px', height: '32px' }}
                    />
                    <div className="flex-grow-1 text-start">
                        <strong>{friend.nickname || friend.username}</strong>
                    </div>
                </button>
            ))}
        </div>
    );
};

export default FriendList;
