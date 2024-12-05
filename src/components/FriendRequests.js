import React from 'react';

function FriendRequests({ friendRequests, onRespond }) {
    return (
        <div className="p-3 bg-light border rounded" style={{marginTop: '69px'}}>
            <h3 className="mb-3">Friend Requests</h3>
            {friendRequests.length === 0 ? (
                <p className="text-muted">No pending friend requests.</p>
            ) : (
                <div className="list-group">
                    {friendRequests.map(request => (
                        <div
                            key={request.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                        >
                            <div>
                                <p className="mb-0 fw-bold">{request.nickname || request.username}</p>
                            </div>
                            <div>
                                <button
                                    className="btn btn-sm btn-success me-2"
                                    onClick={() => onRespond(request.id, 'accept')}
                                >
                                    Accept
                                </button>
                                <button
                                    className="btn btn-sm btn-danger"
                                    onClick={() => onRespond(request.id, 'reject')}
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default FriendRequests;
