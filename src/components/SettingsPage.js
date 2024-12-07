import React, { useState } from "react";

const SettingsPage = ({ onUpdatePassword, isDarkMode, isAutoMode, onToggleDarkMode, onToggleAutoMode }) => {
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handlePasswordUpdate = () => {
        onUpdatePassword(oldPassword, newPassword, confirmPassword);
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
    };

    return (
        <div className="container mt-5" style={{ overflowY:"auto" }}>
            <h1 className="mb-4" style={{marginTop:"30px"}}>Settings</h1>
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

            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">About</h5>
                    <p>Version: 1.0.0</p>
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
