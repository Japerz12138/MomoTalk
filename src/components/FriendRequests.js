import React from 'react';

function FriendRequests({ friendRequests, onRespond }) {
    return (
        <div className="p-3 bg-light border rounded" style={{ marginTop: '69px' }}>
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
                            <div className="btn-group" role="group" aria-label="Friend request actions">
                                <button
                                    type="button"
                                    className="btn btn-success"
                                    onClick={() => onRespond(request.id, 'accept')}
                                    title="Accept Friend Request"
                                >
                                    <i className="bi bi-check-circle"></i>
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => onRespond(request.id, 'reject')}
                                    title="Reject Friend Request"
                                >
                                    <i className="bi bi-x-circle"></i>
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
