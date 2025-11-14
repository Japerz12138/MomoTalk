import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import '../custom_styles/UserProfile.css';
import { DEFAULT_AVATAR } from '../constants';
import ImageUpload from './ImageUpload';
import { getFullImageUrl } from '../utils/imageHelper';

const UserProfile = ({ user, isOwnProfile, onSendMessage, onRemoveFriend, onUpdateProfile, onClose, isMobile }) => {
    const { t, i18n } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [newInput, setNewInput] = useState('');
    const [birthdayMonth, setBirthdayMonth] = useState('');
    const [birthdayDay, setBirthdayDay] = useState('');
    const [showRemoveFriendModal, setShowRemoveFriendModal] = useState(false);
    const [uploadError, setUploadError] = useState('');

    const handleEditClick = (type) => {
        setModalType(type);
        if (type === 'nickname') {
            setNewInput(user.nickname || '');
        } else if (type === 'signature') {
            setNewInput(user.signature || '');
        } else if (type === 'birthday') {
            if (user.birthday) {
                const [month, day] = user.birthday.split('-');
                setBirthdayMonth(month || '');
                setBirthdayDay(day || '');
            } else {
                setBirthdayMonth('');
                setBirthdayDay('');
            }
        } else {
            setNewInput('');
        }
        setUploadError('');
        setShowModal(true);
    };

    const handleAvatarUpload = async (file) => {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('No authentication token found');
        }

        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/upload/avatar`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.avatarUrl) {
                // Update the profile with new avatar URL, preserving signature and birthday
                onUpdateProfile({ 
                    nickname: user.nickname, 
                    avatar: response.data.avatarUrl,
                    signature: user.signature,
                    birthday: user.birthday
                });
                setShowModal(false);
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw new Error(error.response?.data?.error || 'Failed to upload avatar');
        }
    };

    const handleSave = () => {
        if (modalType === 'nickname') {
            onUpdateProfile({ nickname: newInput, avatar: user.avatar, signature: user.signature, birthday: user.birthday });
            setShowModal(false);
        } else if (modalType === 'signature') {
            onUpdateProfile({ nickname: user.nickname, avatar: user.avatar, signature: newInput, birthday: user.birthday });
            setShowModal(false);
        } else if (modalType === 'birthday') {
            if (birthdayMonth && birthdayDay) {
                const birthday = `${birthdayMonth.padStart(2, '0')}-${birthdayDay.padStart(2, '0')}`;
                onUpdateProfile({ nickname: user.nickname, avatar: user.avatar, signature: user.signature, birthday: birthday });
            } else {
                // Clear birthday if both are empty
                onUpdateProfile({ nickname: user.nickname, avatar: user.avatar, signature: user.signature, birthday: '' });
            }
            setShowModal(false);
        }
    };

    // Format birthday for display (MM-DD -> Month Day)
    const formatBirthday = (birthday) => {
        if (!birthday) return null;
        const [month, day] = birthday.split('-');
        const monthNames = [
            t('months.january'), t('months.february'), t('months.march'), t('months.april'),
            t('months.may'), t('months.june'), t('months.july'), t('months.august'),
            t('months.september'), t('months.october'), t('months.november'), t('months.december')
        ];
        const monthName = monthNames[parseInt(month) - 1];
        const dayNum = parseInt(day);
        // Add "日" for Chinese, nothing for English
        const daySuffix = i18n.language === 'zh-CN' ? '日' : '';
        return `${monthName} ${dayNum}${daySuffix}`;
    };

    return (
        <div className={isMobile ? '' : 'container mt-4'} style={{ paddingTop: isMobile ? '0' : 'inherit', margin: isMobile ? '0' : 'auto', padding: isMobile ? '0' : 'inherit' }}>
            {/* Mobile header */}
            {isMobile && (
                <div className="mobile-chat-header" style={{
                    position: 'sticky',
                    top: 0,
                    padding: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    minHeight: '64px',
                    margin: '0',
                    width: '100%'
                }}>
                    <button 
                        className="btn btn-link p-0 me-2" 
                        onClick={onClose}
                        style={{ fontSize: '1.5rem', lineHeight: 1 }}
                    >
                        <i className="bi bi-arrow-left"></i>
                    </button>
                    <h6 className="mb-0" style={{ fontSize: '1.25rem', lineHeight: 1 }}>
                        {isOwnProfile ? t('profile.myProfile') : user.nickname || user.username}
                    </h6>
                </div>
            )}
            
            <div className="card mx-auto" style={{ 
                maxWidth: '400px', 
                boxShadow: isMobile ? 'none' : '0px 4px 8px rgba(0, 0, 0, 0.2)', 
                marginTop: isMobile ? '16px' : 'var(--header-height, 69px)', 
                marginLeft: isMobile ? '16px' : 'auto',
                marginRight: isMobile ? '16px' : 'auto',
                border: 'none' 
            }}>
                <div className="card-body text-center">
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        <img
                            src={getFullImageUrl(user.avatar || DEFAULT_AVATAR)}
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
                            : user.username || t('profile.noNickname')}
                    </h5>
                    {isOwnProfile && (
                        <p className="text-muted">
                            @{user.username || "Unknown Username"}
                        </p>
                    )}
                    <p className="text-muted" style={{ fontSize: '0.95rem', marginTop: isOwnProfile ? '5px' : '10px' }}>
                        {user.signature || (isOwnProfile ? t('profile.noSignature') : '')}
                    </p>
                    {user.birthday && (
                        <div style={{
                            marginTop: '10px',
                            marginBottom: '10px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            borderRadius: '25px',
                            border: '2.5px solid rgba(73, 90, 110, 0.5)',
                            backgroundColor: 'transparent'
                        }}>
                            <i className="bi bi-cake2-fill" style={{ color: '#495A6E', fontSize: '1rem' }}></i>
                            <span style={{ color: '#495A6E', fontSize: '0.9rem', fontWeight: '500' }}>
                                {formatBirthday(user.birthday)}
                            </span>
                        </div>
                    )}
                    {user.momoCode && (
                        <div style={{ 
                            marginTop: '10px', 
                            marginBottom: '10px',
                            padding: '10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                        }}>
                            <small style={{ color: '#666', display: 'block', marginBottom: '5px' }}>
                                <strong>Momo Code:</strong>
                            </small>
                            <div style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 'bold', 
                                color: '#4C5B6F',
                                letterSpacing: '2px'
                            }}>
                                {user.momoCode}
                            </div>
                        </div>
                    )}

                    {isOwnProfile && (
                        <div className="d-grid gap-2 mt-3">
                            <button
                                className="btn custom-btn"
                                onClick={() => handleEditClick('nickname')}
                            >
                                {t('profile.changeNickname')}
                            </button>
                            <button
                                className="btn custom-btn"
                                onClick={() => handleEditClick('signature')}
                            >
                                {t('profile.changeSignature')}
                            </button>
                            <button
                                className="btn custom-btn"
                                onClick={() => handleEditClick('birthday')}
                            >
                                {t('profile.changeBirthday')}
                            </button>
                        </div>
                    )}

                    {!isOwnProfile && (
                        <div className="d-grid gap-2 mt-3">
                            <button className="btn custom-btn" onClick={onSendMessage}>
                                {t('profile.sendMessage')}
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={() => setShowRemoveFriendModal(true)}
                            >
                                {user.isSelf ? t('profile.clearChatHistory') : t('profile.removeFriend')}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal for editing */}
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
                                    {modalType === 'avatar' ? `  ${t('profile.editAvatar')}` : 
                                     modalType === 'signature' ? `  ${t('profile.editSignature')}` : 
                                     modalType === 'birthday' ? `  ${t('profile.editBirthday')}` : 
                                     `  ${t('profile.editNickname')}`}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {modalType === 'avatar' ? (
                                    <div>
                                        <label className="form-label">{t('profile.uploadAvatar')}</label>
                                        <ImageUpload 
                                            onUpload={handleAvatarUpload}
                                            buttonText={t('profile.uploadAvatarButton')}
                                        />
                                    </div>
                                ) : modalType === 'signature' ? (
                                    <div>
                                        <label htmlFor="inputField" className="form-label">
                                            {t('profile.enterSignature')}
                                        </label>
                                        <input
                                            id="inputField"
                                            type="text"
                                            className="form-control"
                                            value={newInput}
                                            onChange={(e) => setNewInput(e.target.value)}
                                            maxLength="30"
                                            placeholder={t('profile.signaturePlaceholder')}
                                        />
                                        <small className="text-muted">{t('profile.maxCharacters')}</small>
                                    </div>
                                ) : modalType === 'birthday' ? (
                                    <div>
                                        <label className="form-label">
                                            {t('profile.selectBirthday')}
                                        </label>
                                        <div className="row">
                                            <div className="col-6">
                                                <label htmlFor="birthdayMonth" className="form-label small">{t('profile.month')}</label>
                                                <select
                                                    id="birthdayMonth"
                                                    className="form-select"
                                                    value={birthdayMonth}
                                                    onChange={(e) => setBirthdayMonth(e.target.value)}
                                                >
                                                    <option value="">{t('profile.selectMonth')}</option>
                                                    {Array.from({ length: 12 }, (_, i) => {
                                                        const monthNum = i + 1;
                                                        const monthNames = [
                                                            t('months.january'), t('months.february'), t('months.march'), t('months.april'),
                                                            t('months.may'), t('months.june'), t('months.july'), t('months.august'),
                                                            t('months.september'), t('months.october'), t('months.november'), t('months.december')
                                                        ];
                                                        return (
                                                            <option key={monthNum} value={monthNum.toString().padStart(2, '0')}>
                                                                {monthNames[i]}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                            <div className="col-6">
                                                <label htmlFor="birthdayDay" className="form-label small">{t('profile.day')}</label>
                                                <select
                                                    id="birthdayDay"
                                                    className="form-select"
                                                    value={birthdayDay}
                                                    onChange={(e) => setBirthdayDay(e.target.value)}
                                                >
                                                    <option value="">{t('profile.selectDay')}</option>
                                                    {Array.from({ length: 31 }, (_, i) => {
                                                        const day = i + 1;
                                                        return (
                                                            <option key={day} value={day.toString().padStart(2, '0')}>
                                                                {day}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </div>
                                        </div>
                                        <small className="text-muted d-block mt-2">{t('profile.yearNotRequired')}</small>
                                        <button
                                            type="button"
                                            className="btn btn-link btn-sm p-0 mt-2"
                                            onClick={() => {
                                                setBirthdayMonth('');
                                                setBirthdayDay('');
                                            }}
                                        >
                                            {t('profile.clearBirthday')}
                                        </button>
                                    </div>
                                ) : (
                                    <div>
                                        <label htmlFor="inputField" className="form-label">
                                            {t('profile.enterNickname')}
                                        </label>
                                        <input
                                            id="inputField"
                                            type="text"
                                            className="form-control"
                                            value={newInput}
                                            onChange={(e) => setNewInput(e.target.value)}
                                        />
                                    </div>
                                )}
                            </div>
                            {(modalType === 'nickname' || modalType === 'signature' || modalType === 'birthday') && (
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowModal(false)}
                                    >
                                        {t('profile.cancel')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleSave}
                                    >
                                        {t('profile.save')}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal for remove friend */}
            {showRemoveFriendModal && (
                <div
                    className="modal fade show"
                    tabIndex="-1"
                    style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
                >
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    <i className="bi bi-exclamation-triangle"></i> {user.isSelf ? t('profile.confirmClearChat') : t('profile.confirmRemove')}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowRemoveFriendModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {user.isSelf ? t('profile.sureClearChat') : t('profile.sureRemove')}
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowRemoveFriendModal(false)}
                                >
                                    {t('profile.cancel')}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={() => {
                                        onRemoveFriend();
                                        setShowRemoveFriendModal(false);
                                    }}
                                >
                                    {user.isSelf ? t('profile.clear') : t('profile.remove')}
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
