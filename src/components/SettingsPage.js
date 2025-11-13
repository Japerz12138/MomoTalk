import React, { useState, useEffect } from "react";
import axios from "axios";

const SettingsPage = ({ onUpdatePassword, isDarkMode, isAutoMode, onToggleDarkMode, onToggleAutoMode, onDeleteAccount }) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [countdown, setCountdown] = useState(10);
    // Check if Notification API is supported before accessing it (iOS Safari doesn't support it)
    const [notificationPermission, setNotificationPermission] = useState(
        ('Notification' in window) ? Notification.permission : 'unsupported'
    );
    const [internalNotificationEnabled, setInternalNotificationEnabled] = useState(() => {
        const storedValue = localStorage.getItem("internalNotificationEnabled");
        if (storedValue === null) {
            localStorage.setItem("internalNotificationEnabled", JSON.stringify(true));
            return true;
        }
        return JSON.parse(storedValue);
    });

    useEffect(() => {
        // Check if Notification API is supported (not available on iOS Safari)
        if ('Notification' in window) {
            setNotificationPermission(Notification.permission);
        } else {
            setNotificationPermission('unsupported');
        }
    }, []);

    const handlePasswordUpdate = () => {
        onUpdatePassword(oldPassword, newPassword, confirmPassword);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const requestNotificationPermission = () => {
        // Check if Notification API is supported
        if (!('Notification' in window)) {
            alert("Notifications are not supported on this device/browser (iOS Safari doesn't support notifications).");
            return;
        }
        
        if (notificationPermission === "denied") {
            alert(
                "Notification permission is denied! Please enable it by clicking the \"i\" icon on the left side of your URL bar and change the website notification setting!"
            );
        } else {
            Notification.requestPermission().then((permission) => {
                setNotificationPermission(permission);
            });
        }
    };

    const toggleInternalNotification = () => {
        const newStatus = !internalNotificationEnabled;
        setInternalNotificationEnabled(newStatus);
        localStorage.setItem("internalNotificationEnabled", JSON.stringify(newStatus));
    };

    const handleDeleteAccount = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${process.env.REACT_APP_SERVER_DOMAIN}/user/delete`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            
            // Call the parent's delete account handler (which should handle logout)
            if (onDeleteAccount) {
                onDeleteAccount();
            } else {
                // Fallback: clear local storage and reload
                localStorage.clear();
                window.location.reload();
            }
        } catch (error) {
            console.error('Error deleting account:', error);
            alert(error.response?.data?.error || 'Failed to delete account. Please try again.');
            setShowDeleteModal(false);
            setCountdown(10);
        }
    };

    return (
        <div className="container mt-5" style={{ overflowY: "auto" }}>
            <h1 className="mb-4" style={{ marginTop: "30px" }}>Settings</h1>

            {/* Change Password Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Change Password</h5>
                    <div className="mb-3">
                        <label className="form-label">Current Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">Confirm New Password</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handlePasswordUpdate}>
                        Update Password
                    </button>
                </div>
            </div>

            {/*Dark mode not really working, gonna hide it for now*/}

            {/*<div className="card mb-4">*/}
            {/*    <div className="card-body">*/}
            {/*        <h5 className="card-title">Display Mode</h5>*/}
            {/*        <div className="form-check form-switch">*/}
            {/*            <input*/}
            {/*                className="form-check-input"*/}
            {/*                type="checkbox"*/}
            {/*                checked={isDarkMode}*/}
            {/*                onChange={onToggleDarkMode}*/}
            {/*            />*/}
            {/*            <label className="form-check-label">Dark Mode</label>*/}
            {/*        </div>*/}
            {/*        <div className="form-check form-switch mt-3">*/}
            {/*            <input*/}
            {/*                className="form-check-input"*/}
            {/*                type="checkbox"*/}
            {/*                checked={isAutoMode}*/}
            {/*                onChange={onToggleAutoMode}*/}
            {/*            />*/}
            {/*            <label className="form-check-label">Auto Mode</label>*/}
            {/*        </div>*/}
            {/*    </div>*/}
            {/*</div>*/}


            {/* Notifications Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">Notifications</h5>
                    {notificationPermission === "unsupported" ? (
                        <div className="alert alert-info d-flex align-items-center" role="alert">
                            <div>
                                Notifications are not supported on this device/browser. iOS Safari and some browsers don't support web notifications.
                            </div>
                        </div>
                    ) : notificationPermission === "granted" ? (
                        <>
                            <div className="alert alert-success d-flex align-items-center" role="alert">
                                <div>Notification has been enabled!</div>
                            </div>
                            <div className="form-check form-switch mt-3">
                                <input
                                    className="form-check-input"
                                    type="checkbox"
                                    id="internalNotificationSwitch"
                                    checked={internalNotificationEnabled}
                                    onChange={toggleInternalNotification}
                                />
                                <label className="form-check-label" htmlFor="internalNotificationSwitch">
                                    Enable MomoTalk Notifications
                                </label>
                            </div>
                        </>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={requestNotificationPermission}
                        >
                            {notificationPermission === "denied"
                                ? "Enable Notifications (Check Settings)"
                                : "Enable Notifications"}
                        </button>
                    )}
                    {notificationPermission === "denied" && (
                        <div className="alert alert-warning d-flex align-items-center mt-3" role="alert">
                            <div>
                                Notifications are denied. Please enable them in your browser settings.
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* About Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">About</h5>
                    <p>Version: 1.2.0</p>
                    <p>Welcome to MomoTalk! This is CSCI 621 - Programming Languages Final Project!</p>
                    <p>Professor: Khalid Mirza</p>
                    <p>Github: Japerz12138</p>
                    <a href="https://github.com/Japerz12138/momotalk_v2">https://github.com/Japerz12138/momotalk_v2</a>
                </div>
            </div>

            {/* Delete Account Section */}
            <div className="card border-danger">
                <div className="card-body">
                    <h5 className="card-title text-danger">Danger Zone</h5>
                    <p className="text-muted">Once you delete your account, there is no going back. Please be certain.</p>
                    <button 
                        className="btn btn-danger" 
                        onClick={() => setShowDeleteModal(true)}
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Delete Account Confirmation Modal */}
            {showDeleteModal && (
                <DeleteAccountModal
                    show={showDeleteModal}
                    onClose={() => {
                        setShowDeleteModal(false);
                        setCountdown(10);
                    }}
                    onConfirm={handleDeleteAccount}
                    countdown={countdown}
                    setCountdown={setCountdown}
                />
            )}
        </div>
    );
};

// Delete Account Confirmation Modal Component
const DeleteAccountModal = ({ show, onClose, onConfirm, countdown, setCountdown }) => {
    useEffect(() => {
        if (show) {
            // Reset countdown when modal opens
            setCountdown(10);
            const interval = setInterval(() => {
                setCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            return () => clearInterval(interval);
        }
    }, [show, setCountdown]);

    const handleConfirm = () => {
        if (countdown === 0) {
            onConfirm();
        }
    };

    if (!show) return null;

    return (
        <div
            className="modal show"
            style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            tabIndex="-1"
        >
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header border-danger">
                        <h5 className="modal-title text-danger">
                            <i className="bi bi-exclamation-triangle-fill"></i> SYSTEM WARNING
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        ></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-danger fw-bold">Initiating this sequence will permanently purge the following data sectors!</p>
                        <p>This will permanently delete:</p>
                        <ul>
                            <li>User Identity Core (Account & Profile)</li>
                            <li>Message Archives & Neural Threads</li>
                            <li>Social Link Protocols</li>
                            <li>Emoji Preference Matrix</li>
                            <li>Active Session Keys</li>
                        </ul>
                        <p className="text-muted">To confirm total data annihilation, proceed below.</p>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            Abort Sequence
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleConfirm}
                            disabled={countdown > 0}
                        >
                            {countdown > 0 ? `ENGAGE COUNTDOWN (${countdown}s)` : 'ENGAGE DELETION'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
