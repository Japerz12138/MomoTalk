import React from 'react';
import styles from '../styles';

function FriendRequests({ friendRequests, onRespond }) {
    return (
        <div style={styles.requestsContainer}>
            <h3>Friend Requests</h3>
            {friendRequests.length === 0 ? (
                <p>No pending friend requests.</p>
            ) : (
                friendRequests.map(request => (
                    <div key={request.id} style={styles.requestItem}>
                        <p>{request.nickname || request.username}</p>
                        <button
                            style={styles.acceptButton}
                            onClick={() => onRespond(request.id, 'accept')}
                        >
                            Accept
                        </button>
                        <button
                            style={styles.rejectButton}
                            onClick={() => onRespond(request.id, 'reject')}
                        >
                            Reject
                        </button>
                    </div>
                ))
            )}
        </div>
    );
}

export default FriendRequests;
