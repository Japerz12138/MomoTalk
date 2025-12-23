import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import { DEFAULT_AVATAR } from '../constants';
import ImageUpload from './ImageUpload';
import { getFullImageUrl } from '../utils/imageHelper';

const GroupProfile = ({ group, userId, isCreator, onSendMessage, onLeaveGroup, onDisbandGroup, onUpdateGroup, onClose, isMobile }) => {
    const { t } = useTranslation();
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState('');
    const [newInput, setNewInput] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [members, setMembers] = useState([]);
    const [showRemoveMemberModal, setShowRemoveMemberModal] = useState(null);

    useEffect(() => {
        if (group && group.id) {
            fetchMembers();
        }
    }, [group]);

    const fetchMembers = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/groups/${group.id}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Sort members: creator first, then by lastMessageTime (most recent first)
            const sortedMembers = response.data.sort((a, b) => {
                // Creator always first
                if (a.id === group.created_by) return -1;
                if (b.id === group.created_by) return 1;
                
                // Then sort by lastMessageTime (most recent first)
                const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
                const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
                return timeB - timeA; // Descending order (most recent first)
            });
            setMembers(sortedMembers);
        } catch (error) {
            console.error('Error fetching group members:', error);
        }
    };

    const handleEditClick = (type) => {
        setModalType(type);
        if (type === 'name') {
            setNewInput(group.name || '');
        } else if (type === 'signature') {
            setNewInput(group.signature || '');
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
                onUpdateGroup({ 
                    name: group.name, 
                    avatar: response.data.avatarUrl,
                    signature: group.signature
                });
                setShowModal(false);
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
            throw new Error(error.response?.data?.error || 'Failed to upload avatar');
        }
    };

    const handleSave = () => {
        if (modalType === 'name') {
            onUpdateGroup({ 
                name: newInput.trim(), 
                avatar: group.avatar, 
                signature: group.signature 
            });
            setShowModal(false);
        } else if (modalType === 'signature') {
            onUpdateGroup({ 
                name: group.name, 
                avatar: group.avatar, 
                signature: newInput 
            });
            setShowModal(false);
        }
    };

    const handleRemoveMember = async (memberId) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/groups/${group.id}/remove-member`, 
                { memberId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchMembers();
            setShowRemoveMemberModal(null);
        } catch (error) {
            console.error('Error removing member:', error);
            alert(error.response?.data?.error || 'Failed to remove member');
        }
    };

    return (
        <div className={isMobile ? '' : 'container mt-4'} style={{ paddingTop: isMobile ? '0' : 'inherit', margin: isMobile ? '0' : 'auto', padding: isMobile ? '0' : 'inherit', height: isMobile ? 'auto' : '100%', overflowY: 'auto' }}>
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
                        {group.name || 'Group'}
                    </h6>
                </div>
            )}
            
            <div className="card mx-auto" style={{ 
                maxWidth: '400px', 
                boxShadow: isMobile ? 'none' : '0px 4px 8px rgba(0, 0, 0, 0.2)', 
                marginTop: isMobile ? '16px' : 'var(--header-height, 69px)', 
                marginBottom: isMobile ? '16px' : '20px',
                marginLeft: isMobile ? '16px' : 'auto',
                marginRight: isMobile ? '16px' : 'auto',
                border: 'none',
                position: 'relative'
            }}>
                <div className="card-body text-center" style={{ position: 'relative' }}>
                    <div style={{ position: 'relative', display: 'inline-block' }}>
                        {group.avatar ? (
                            <img
                                src={getFullImageUrl(group.avatar)}
                                alt="Group Avatar"
                                className="rounded-circle mb-3"
                                style={{ width: '120px', height: '120px', objectFit: 'cover', cursor: isCreator ? 'pointer' : 'default' }}
                                onClick={() => isCreator && handleEditClick('avatar')}
                            />
                        ) : (
                            <div
                                className="rounded-circle mb-3"
                                style={{
                                    width: '120px',
                                    height: '120px',
                                    backgroundColor: '#e9ecef',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: isCreator ? 'pointer' : 'default',
                                    margin: '0 auto'
                                }}
                                onClick={() => isCreator && handleEditClick('avatar')}
                            >
                                <i className="bi bi-people" style={{ fontSize: '48px', color: '#6c757d' }}></i>
                            </div>
                        )}
                        {isCreator && (
                            <span
                                style={{
                                    position: 'absolute',
                                    bottom: '5px',
                                    right: group.avatar ? '5px' : 'calc(50% - 15px)',
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

                    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
                        <h5 className="card-title" style={{ display: 'inline-block', marginRight: '8px' }}>
                            {group.name || 'Group'}
                        </h5>
                        {isCreator && (
                            <span
                                style={{
                                    cursor: 'pointer',
                                    fontSize: '0.9rem',
                                    color: '#495A6E',
                                    verticalAlign: 'middle'
                                }}
                                onClick={() => handleEditClick('name')}
                                title="编辑群名称"
                            >
                                <i className="bi bi-pencil"></i>
                            </span>
                        )}
                    </div>
                    {group.signature && (
                        <p className="text-muted" style={{ fontSize: '0.95rem', marginTop: '5px' }}>
                            {group.signature}
                        </p>
                    )}
                    {group.groupCode && (
                        <div style={{ 
                            marginTop: '10px', 
                            marginBottom: '10px',
                            padding: '10px',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '8px'
                        }}>
                            <small style={{ color: '#666', display: 'block', marginBottom: '5px' }}>
                                <strong>Group Code:</strong>
                            </small>
                            <div style={{ 
                                fontSize: '1.2rem', 
                                fontWeight: 'bold', 
                                color: '#4C5B6F',
                                letterSpacing: '2px'
                            }}>
                                {group.groupCode}
                            </div>
                        </div>
                    )}

                    {/* Members List */}
                    <div style={{ marginTop: '20px', textAlign: 'left' }}>
                        <h6 style={{ marginBottom: '10px' }}>群成员 ({members.length})</h6>
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                            {members.map((member) => (
                                <div key={member.id} style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    padding: '8px',
                                    marginBottom: '8px',
                                    backgroundColor: '#f8f9fa',
                                    borderRadius: '8px'
                                }}>
                                    <img
                                        src={getFullImageUrl(member.avatar || DEFAULT_AVATAR)}
                                        alt={member.nickname}
                                        className="rounded-circle"
                                        style={{ width: '40px', height: '40px', objectFit: 'cover', marginRight: '12px' }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: '500' }}>{member.nickname || member.username}</div>
                                        {member.id === group.created_by && (
                                            <small style={{ color: '#6c757d' }}>创建者</small>
                                        )}
                                    </div>
                                    {isCreator && member.id !== userId && (
                                        <button
                                            className="btn btn-sm btn-danger"
                                            onClick={() => setShowRemoveMemberModal(member.id)}
                                        >
                                            踢出
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="d-grid gap-2 mt-3">
                        <button className="btn custom-btn" onClick={onSendMessage}>
                            {t('profile.sendMessage', '发送消息')}
                        </button>
                        {isCreator ? (
                            <>
                                <button
                                    className="btn custom-btn"
                                    onClick={() => handleEditClick('signature')}
                                >
                                    编辑群组签名
                                </button>
                                <button
                                    className="btn btn-danger"
                                    onClick={onDisbandGroup}
                                >
                                    解散群组
                                </button>
                            </>
                        ) : (
                            <button
                                className="btn btn-danger"
                                onClick={onLeaveGroup}
                            >
                                退出群组
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal for editing */}
            {showModal && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setShowModal(false)}
                >
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">
                                    {modalType === 'avatar' ? '更换群组头像' : 
                                     modalType === 'name' ? '编辑群名称' : 
                                     '编辑群组签名'}
                                </h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowModal(false)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                {modalType === 'avatar' ? (
                                    <ImageUpload
                                        onUpload={handleAvatarUpload}
                                        uploadError={uploadError}
                                        setUploadError={setUploadError}
                                    />
                                ) : (
                                    <>
                                        <div className="mb-3">
                                            <label className="form-label">
                                                {modalType === 'name' ? '群名称' : '群组签名'}
                                            </label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={newInput}
                                                onChange={(e) => setNewInput(e.target.value)}
                                                placeholder={modalType === 'name' ? '输入群名称' : '输入群组签名'}
                                                maxLength={modalType === 'name' ? 100 : 200}
                                            />
                                        </div>
                                        <div className="d-flex gap-2">
                                            <button 
                                                className="btn btn-primary" 
                                                onClick={handleSave}
                                                disabled={modalType === 'name' && !newInput.trim()}
                                            >
                                                保存
                                            </button>
                                            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                                取消
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Remove member confirmation modal */}
            {showRemoveMemberModal && (
                <div
                    className="modal fade show"
                    style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}
                    onClick={() => setShowRemoveMemberModal(null)}
                >
                    <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">确认踢出成员</h5>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowRemoveMemberModal(null)}
                                ></button>
                            </div>
                            <div className="modal-body">
                                <p>确定要踢出该成员吗？</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    className="btn btn-danger"
                                    onClick={() => handleRemoveMember(showRemoveMemberModal)}
                                >
                                    确认
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => setShowRemoveMemberModal(null)}
                                >
                                    取消
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default GroupProfile;

