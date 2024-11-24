import React from 'react';
import styles from '../styles';

function FriendList({ friends, onSelectFriend, onRemoveFriend }) {
    return (
        <div style={styles.friendList}>
            {friends.map(friend => (
                <div key={friend.id} style={styles.friendItem} onClick={() => onSelectFriend(friend)}>
                    <img src={friend.avatar || 'https://via.placeholder.com/40'} alt="Avatar" style={styles.friendAvatar} />
                    <div>
                        <p style={styles.friendName}>{friend.nickname || friend.username}</p>
                        <p style={styles.lastMessage}>{friend.lastMessage || 'No messages yet'}</p>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onRemoveFriend(friend.id); }} style={styles.removeButton}>
                        Remove
                    </button>
                </div>
            ))}
        </div>
    );
}

export default FriendList;
