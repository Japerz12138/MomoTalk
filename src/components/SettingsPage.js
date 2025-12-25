import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useTranslation } from "react-i18next";

const SettingsPage = ({ onUpdatePassword, isDarkMode, isAutoMode, onToggleDarkMode, onToggleAutoMode, onDeleteAccount, showMultiDevice, onToggleMultiDevice }) => {
    const { t, i18n } = useTranslation();
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [countdown, setCountdown] = useState(10);
    const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
    const languageDropdownRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target)) {
                setShowLanguageDropdown(false);
            }
        };

        if (showLanguageDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showLanguageDropdown]);

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
            alert(t('alerts.notificationsUnsupported'));
            return;
        }
        
        if (notificationPermission === "denied") {
            alert(t('alerts.notificationDenied'));
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
            <h1 className="mb-4" style={{ marginTop: "30px" }}>{t('settings.title')}</h1>

            {/* Language Selection */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{t('settings.language')}</h5>
                    <div className="mb-3">
                        <label className="form-label">{t('settings.selectLanguage')}</label>
                        <div className="dropdown" ref={languageDropdownRef}>
                            <button
                                className="btn btn-outline-secondary dropdown-toggle"
                                type="button"
                                id="languageDropdown"
                                aria-expanded={showLanguageDropdown}
                                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                                style={{
                                    color: '#4C5B6F',
                                    borderColor: '#4C5B6F'
                                }}
                            >
                                {i18n.language === 'zh-CN' ? '简体中文' : 'English'}
                            </button>
                            <style>{`
                                #languageDropdown::after {
                                    border-top-color: #4C5B6F !important;
                                    color: white !important;
                                }
                                #languageDropdown:hover {
                                    color: #4C5B6F !important;
                                    border-color: #4C5B6F !important;
                                }
                                #languageDropdown:hover::after {
                                    border-top-color: #4C5B6F !important;
                                }
                                #languageDropdown ~ .dropdown-menu .dropdown-item.active {
                                    background-color: #4C5B6F !important;
                                    color: white !important;
                                }
                                #languageDropdown ~ .dropdown-menu .dropdown-item:hover {
                                    background-color: rgba(76, 91, 111, 0.8) !important;
                                    color: white !important;
                                }
                            `}</style>
                            <ul className={`dropdown-menu ${showLanguageDropdown ? 'show' : ''}`} aria-labelledby="languageDropdown">
                                <li>
                                    <a
                                        className={`dropdown-item ${i18n.language === 'en' ? 'active' : ''}`}
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            i18n.changeLanguage('en');
                                            setShowLanguageDropdown(false);
                                        }}
                                    >
                                        English
                                    </a>
                                </li>
                                <li>
                                    <a
                                        className={`dropdown-item ${i18n.language === 'zh-CN' ? 'active' : ''}`}
                                        href="#"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            i18n.changeLanguage('zh-CN');
                                            setShowLanguageDropdown(false);
                                        }}
                                    >
                                        简体中文
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Password Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{t('settings.changePassword')}</h5>
                    <div className="mb-3">
                        <label className="form-label">{t('settings.currentPassword')}</label>
                        <input
                            type="password"
                            className="form-control"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">{t('settings.newPassword')}</label>
                        <input
                            type="password"
                            className="form-control"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                        />
                    </div>
                    <div className="mb-3">
                        <label className="form-label">{t('settings.confirmNewPassword')}</label>
                        <input
                            type="password"
                            className="form-control"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary" onClick={handlePasswordUpdate}>
                        {t('settings.updatePassword')}
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


            {/* Multi-Device Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{t('settings.multiDevice')}</h5>
                    <div className="form-check form-switch">
                        <input
                            className="form-check-input"
                            type="checkbox"
                            id="multiDeviceSwitch"
                            checked={showMultiDevice}
                            onChange={onToggleMultiDevice}
                        />
                        <label className="form-check-label" htmlFor="multiDeviceSwitch">
                            {t('settings.showMultiDevice')}
                        </label>
                    </div>
                    <small className="text-muted d-block mt-2">{t('settings.multiDeviceDesc')}</small>
                </div>
            </div>

            {/* Notifications Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{t('settings.notifications')}</h5>
                    {notificationPermission === "unsupported" ? (
                        <div className="alert alert-info d-flex align-items-center" role="alert">
                            <div>
                                {t('settings.notificationsUnsupported')}
                            </div>
                        </div>
                    ) : notificationPermission === "granted" ? (
                        <>
                            <div className="alert alert-success d-flex align-items-center" role="alert">
                                <div>{t('settings.notificationsEnabled')}</div>
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
                                    {t('settings.enableMomoTalkNotifications')}
                                </label>
                            </div>
                        </>
                    ) : (
                        <button
                            className="btn btn-primary"
                            onClick={requestNotificationPermission}
                        >
                            {notificationPermission === "denied"
                                ? t('settings.enableNotificationsCheckSettings')
                                : t('settings.enableNotifications')}
                        </button>
                    )}
                    {notificationPermission === "denied" && (
                        <div className="alert alert-warning d-flex align-items-center mt-3" role="alert">
                            <div>
                                {t('settings.notificationsDenied')}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* About Section */}
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{t('settings.about')}</h5>
                    <p>{t('settings.version')}</p>
                    <p>{t('settings.welcome')}</p>
                    <p>{t('settings.professor')}</p>
                    <p>{t('settings.github')}</p>
                    <a href="https://github.com/Japerz12138/momotalk">https://github.com/Japerz12138/momotalk</a>
                </div>
            </div>

            {/* Delete Account Section */}
            <div className="card border-danger">
                <div className="card-body">
                    <h5 className="card-title text-danger">{t('settings.dangerZone')}</h5>
                    <p className="text-muted">{t('settings.deleteAccountWarning')}</p>
                    <button 
                        className="btn btn-danger" 
                        onClick={() => setShowDeleteModal(true)}
                    >
                        {t('settings.deleteAccount')}
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
    const { t } = useTranslation();
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
                            <i className="bi bi-exclamation-triangle-fill"></i> {t('deleteAccount.warning')}
                        </h5>
                        <button
                            type="button"
                            className="btn-close"
                            onClick={onClose}
                        ></button>
                    </div>
                    <div className="modal-body">
                        <p className="text-danger fw-bold">{t('deleteAccount.initiating')}</p>
                        <p>{t('deleteAccount.willDelete')}</p>
                        <ul>
                            <li>{t('deleteAccount.userIdentity')}</li>
                            <li>{t('deleteAccount.messageArchives')}</li>
                            <li>{t('deleteAccount.socialLinks')}</li>
                            <li>{t('deleteAccount.emojiPreferences')}</li>
                            <li>{t('deleteAccount.sessionKeys')}</li>
                        </ul>
                        <p className="text-muted">{t('deleteAccount.confirm')}</p>
                    </div>
                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                        >
                            {t('deleteAccount.abort')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-danger"
                            onClick={handleConfirm}
                            disabled={countdown > 0}
                        >
                            {countdown > 0 ? t('deleteAccount.countdown', { count: countdown }) : t('deleteAccount.engage')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
