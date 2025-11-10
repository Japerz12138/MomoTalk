import React, { useState, useEffect } from "react";

const SettingsPage = ({ onUpdatePassword, isDarkMode, isAutoMode, onToggleDarkMode, onToggleAutoMode }) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
    const [internalNotificationEnabled, setInternalNotificationEnabled] = useState(() => {
        const storedValue = localStorage.getItem("internalNotificationEnabled");
        if (storedValue === null) {
            localStorage.setItem("internalNotificationEnabled", JSON.stringify(true));
            return true;
        }
        return JSON.parse(storedValue);
    });

    useEffect(() => {
        setNotificationPermission(Notification.permission);
    }, []);

    const handlePasswordUpdate = () => {
        onUpdatePassword(oldPassword, newPassword, confirmPassword);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    const requestNotificationPermission = () => {
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
                    {notificationPermission === "granted" ? (
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
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">About</h5>
                    <p>Version: 1.1.0</p>
                    <p>Welcome to MomoTalk! This is CSCI 621 - Programming Languages Final Project!</p>
                    <p>Professor: Khalid Mirza</p>
                    <p>Github: Japerz12138</p>
                    <a href="https://github.com/Japerz12138/momotalk_v2">https://github.com/Japerz12138/momotalk_v2</a>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
