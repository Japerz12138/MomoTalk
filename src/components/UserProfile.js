import React, { useState } from 'react';

const UserProfile = ({ user, isOwnProfile, onSendMessage, onRemoveFriend, onUpdateProfile, onClose }) => {
    const [showModal, setShowModal] = useState(false);

    const handleRemove = () => {
        onRemoveFriend();
        setShowModal(false); // Close the modal
        if (onClose) onClose(); // Close the profile card
    };

    return (
        <div className="container mt-4">
            <div className="card mx-auto" style={{ maxWidth: '400px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)', marginTop: '69px' }}>
                <div className="card-body text-center">
                    <img
                        src={user.avatar || 'https://via.placeholder.com/100'}
                        alt="Avatar"
                        className="rounded-circle mb-3"
                        style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                    />
                    <h5 className="card-title">{user.nickname || 'No Nickname'}</h5>
                    <p className="text-muted">@{user.username}</p>

                    {isOwnProfile ? (
                        <button
                            className="btn btn-outline-primary mt-2"
                            onClick={() => {
                                const newNickname = prompt('Enter new nickname:', user.nickname || '');
                                if (newNickname && onUpdateProfile) {
                                    onUpdateProfile({ nickname: newNickname });
                                }
                            }}
                        >
                            Edit Profile
                        </button>
                    ) : (
                        <div className="d-grid gap-2 mt-3">
                            <button className="btn btn-primary" onClick={onSendMessage}>
                                Send Message
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowModal(true)} // Show the confirmation modal
                            >
                                Remove Friend
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal */}
            {showModal && (
                <div
                    className="modal fade show"
                    tabIndex="-1"
                    style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Confirm Removal</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to remove {user.nickname || user.username} from your friends?</p>
                                <p>This will also delete your conversation with this user!</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleRemove}
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserProfile;
