import React from 'react';

const FriendList = ({ friends, onSelectFriend }) => {
    return (
        <div style={{ width: '4.5rem', marginTop: '69px'}}>
            {friends.map((friend) => (
                <div
                    key={friend.id}
                    className="list-group-item"
                    onClick={() => onSelectFriend(friend)}
                >
                    {friend.nickname || friend.username}
                </div>
            ))}
        </div>
    );
};

export default FriendList;
