import React from 'react';

function FriendRequests({ friendRequests, onRespond }) {
    return (
        <div className="p-3 bg-light border rounded" style={{ marginTop: 'var(--header-height, 69px)' }}>
            {friendRequests.length === 0 ? (
                <div className="text-center text-muted" style={{ marginTop: '5px' }}>
                    <i className="bi bi-envelope-open" style={{ fontSize: '1.2rem', marginBottom: '10px' }}></i>
                    <p className="mb-0" style={{ fontSize: '0.9rem' }}>No pending friend requests</p>
                </div>
            ) : (
                <div className="list-group">
                    <h5 className="mb-3" style={{ color: '#FF95AA', fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '10px' }}>Pending List</h5>
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
