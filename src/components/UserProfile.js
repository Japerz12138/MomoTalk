import React, { useState } from 'react';
import '../custom_styles/UserProfile.css';
const DEFAULT_AVATAR = "https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg";

const UserProfile = ({ user, isOwnProfile, onSendMessage, onRemoveFriend, onUpdateProfile, onClose }) => {
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [newInput, setNewInput] = useState('');

    const handleEditClick = (type) => {
        setModalType(type);
        setNewInput(type === 'avatar' ? user.avatar || DEFAULT_AVATAR : user.nickname || '');
        setShowModal(true);
    };

    const handleSave = () => {
        if (modalType === 'avatar') {
            onUpdateProfile({ nickname: user.nickname, avatar: newInput });
        } else if (modalType === 'nickname') {
            onUpdateProfile({ nickname: newInput, avatar: user.avatar });
        }
        setShowModal(false);
    };

    return (
        <div className="container mt-4">
            <div className="card mx-auto" style={{ maxWidth: '400px', boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)', marginTop: '69px' }}>
                <div className="card-body text-center">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                            src={user.avatar || DEFAULT_AVATAR}
                            alt="Avatar"
                            className="rounded-circle mb-3"
                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                            onClick={() => isOwnProfile && handleEditClick('avatar')}
                        />
                        {isOwnProfile && (
                            <span
                                style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: '5px',
                                    backgroundColor: 'white',
                                    borderRadius: '50%',
                                    width: '30px',
                                    height: '30px',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2)',
                                }}
                                onClick={() => handleEditClick('avatar')}
                            >
                                <i className="bi bi-pencil" style={{ fontSize: '14px' }}></i>
                            </span>
                        )}
                    </div>

                    <h5 className="card-title">
                        {user.nickname && user.nickname.trim() !== ""
                            ? user.nickname
                            : user.username || "No Nickname"}
                    </h5>
                    <p className="text-muted">
                        @{user.username || "Unknown Username"}
                    </p>

                    {isOwnProfile && (
                        <div className="d-grid gap-2 mt-3">
                            <button
                                className="btn custom-btn"
                                onClick={() => handleEditClick('nickname')}
                            >
                                Change Nickname
                            </button>
                        </div>
                    )}

                    {!isOwnProfile && (
                        <div className="d-grid gap-2 mt-3">
                            <button className="btn custom-btn" onClick={onSendMessage}>
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

            {/* Modal */}
            {showModal && (
                <div
                    className="modal fade show"
                    tabIndex="-1"
                    style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="bi bi-pen"></i>
                                    {modalType === 'avatar' ? '  Edit Avatar' : '  Edit Nickname'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <label htmlFor="inputField" className="form-label">
                                    {modalType === 'avatar' ? 'Enter new avatar URL:' : 'Enter new nickname:'}
                                </label>
                                <input
                                    id="inputField"
                                    type="text"
                                    className="form-control"
                                    value={newInput}
                                    onChange={(e) => setNewInput(e.target.value)}
                                />
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
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                >
                                    Save
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