import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_AVATAR } from '../constants';
import { getFullImageUrl } from '../utils/imageHelper';

const FriendList = ({ friends, groups = [], onSelectFriend, onSelectGroup, onCreateGroup, onJoinGroup, userId, nickname, avatar, showMultiDevice = true }) => {
    const { t } = useTranslation();
    const [selectedFriendId, setSelectedFriendId] = useState(null);
    const [selectedGroupId, setSelectedGroupId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showGroupModal, setShowGroupModal] = useState(false);
    const [groupName, setGroupName] = useState('');
    const [joinGroupId, setJoinGroupId] = useState('');

    const handleSelectFriend = (friend) => {
        setSelectedFriendId(friend.id);
        setSelectedGroupId(null);
        onSelectFriend(friend);
    };

    const handleSelectGroup = (group) => {
        setSelectedGroupId(group.id);
        setSelectedFriendId(null);
        if (onSelectGroup) onSelectGroup(group);
    };

    const handleCreateGroup = () => {
        if (groupName.trim()) {
            onCreateGroup(groupName.trim());
            setGroupName('');
            setShowGroupModal(false);
        }
    };

    const handleJoinGroup = () => {
        if (joinGroupId.trim()) {
            onJoinGroup(parseInt(joinGroupId.trim()));
            setJoinGroupId('');
            setShowGroupModal(false);
        }
    };

    // Filter friends and groups based on search query
    const filteredFriends = friends.filter((friend) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        
        const nickname = (friend.nickname || '').toLowerCase();
        const username = (friend.username || '').toLowerCase();
        const signature = (friend.signature || '').toLowerCase();
        
        return nickname.includes(query) || username.includes(query) || signature.includes(query);
    });

    const filteredGroups = groups.filter((group) => {
        const query = searchQuery.toLowerCase().trim();
        if (!query) return true;
        const name = (group.name || '').toLowerCase();
        return name.includes(query);
    });

    // Calculate online and total friends count
    const onlineFriendsCount = friends.filter(friend => friend.isOnline).length;
    const totalFriendsCount = friends.length;

    return (
        <div style={{ marginTop: 'var(--header-height, 69px)', height: 'calc(100vh - var(--header-height, 69px))', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            {/* Search bar */}
            <div style={{ padding: '12px', borderBottom: '1px solid #dee2e6', backgroundColor: '#fff', flexShrink: 0 }}>
                <div className="input-group">
                    <span className="input-group-text" style={{ backgroundColor: '#fff', border: '1px solid #ced4da' }}>
                        <i className="bi bi-search"></i>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder={t('friendList.search')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        style={{ border: '1px solid #ced4da' }}
                    />
                    {searchQuery && (
                        <button
                            className="btn btn-outline-secondary"
                            type="button"
                            onClick={() => setSearchQuery('')}
                            style={{ border: '1px solid #ced4da' }}
                        >
                            <i className="bi bi-x"></i>
                        </button>
                    )}
                </div>
                {/* Friends count indicator */}
                {totalFriendsCount > 0 && (
                    <div style={{ 
                        marginTop: '8px', 
                        fontSize: '0.85rem', 
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}>
                        <span
                            style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#28a745',
                                borderRadius: '50%',
                                display: 'inline-block',
                                flexShrink: 0
                            }}
                        ></span>
                        <span>
                            {t('friendList.online', { online: onlineFriendsCount, total: totalFriendsCount })}
                        </span>
                    </div>
                )}
                {/* Group actions */}
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                    <button
                        className="btn btn-sm btn-primary"
                        onClick={() => setShowGroupModal(true)}
                        style={{ flex: 1 }}
                    >
                        <i className="bi bi-plus-circle"></i> {t('friendList.createOrJoinGroup', '创建/加入群组')}
                    </button>
                </div>
            </div>

            {/* Group modal */}
            {showGroupModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowGroupModal(false)}>
                    <div style={{
                        backgroundColor: 'white',
                        padding: '20px',
                        borderRadius: '8px',
                        width: '90%',
                        maxWidth: '400px'
                    }} onClick={(e) => e.stopPropagation()}>
                        <h5>{t('friendList.createOrJoinGroup', '创建/加入群组')}</h5>
                        <div style={{ marginBottom: '15px' }}>
                            <label>{t('friendList.createGroup', '创建群组')}</label>
                            <div className="input-group">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={t('friendList.groupName', '群组名称')}
                                    value={groupName}
                                    onChange={(e) => setGroupName(e.target.value)}
                                />
                                <button className="btn btn-primary" onClick={handleCreateGroup}>
                                    {t('friendList.create', '创建')}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label>{t('friendList.joinGroup', '加入群组')}</label>
                            <div className="input-group">
                                <input
                                    type="number"
                                    className="form-control"
                                    placeholder={t('friendList.groupId', '群组ID')}
                                    value={joinGroupId}
                                    onChange={(e) => setJoinGroupId(e.target.value)}
                                />
                                <button className="btn btn-success" onClick={handleJoinGroup}>
                                    {t('friendList.join', '加入')}
                                </button>
                            </div>
                        </div>
                        <button
                            className="btn btn-secondary mt-3"
                            style={{ width: '100%' }}
                            onClick={() => setShowGroupModal(false)}
                        >
                            {t('friendList.cancel', '取消')}
                        </button>
                    </div>
                </div>
            )}

            {/* Friends and groups list */}
            <div className="list-group" style={{ flex: 1, overflowY: 'auto', position: 'relative' }}>
                {userId && showMultiDevice && (
                    <button
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center ${
                            'self' === selectedFriendId ? 'active' : ''
                        }`}
                        onClick={() => {
                            setSelectedFriendId('self');
                            onSelectFriend({ id: userId, nickname: nickname || t('friendList.multiDevice'), avatar, isSelf: true });
                        }}
                        style={{ 
                            backgroundColor: selectedFriendId === 'self' ? '#e7f3ff' : '#f8f9fa',
                            borderLeft: selectedFriendId === 'self' ? '3px solid #4C5B6F' : '3px solid transparent'
                        }}
                    >
                        <div style={{ 
                            position: 'relative',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#e9ecef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            flexShrink: 0
                        }}>
                            <i className="bi bi-box-arrow-up-right" style={{ fontSize: '18px', color: '#6c757d' }}></i>
                        </div>
                        <div className="flex-grow-1 text-start" style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                <strong style={{ color: '#6c757d' }}>{t('friendList.multiDevice')}</strong>
                            </div>
                        </div>
                    </button>
                )}
                {/* Groups */}
                {filteredGroups.map((group) => (
                    <button
                        key={`group_${group.id}`}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center ${
                            group.id === selectedGroupId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectGroup(group)}
                    >
                        <div style={{ 
                            position: 'relative',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            backgroundColor: '#e9ecef',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginRight: '12px',
                            flexShrink: 0
                        }}>
                            <i className="bi bi-people" style={{ fontSize: '18px', color: '#6c757d' }}></i>
                        </div>
                        <div className="flex-grow-1 text-start" style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                <strong>{group.name}</strong>
                            </div>
                            {group.lastMessage && (
                                <div style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#6c757d', 
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%'
                                }}>
                                    {group.imageUrl ? '[图片]' : (group.lastMessage.length > 15 ? `${group.lastMessage.slice(0, 15)}...` : group.lastMessage)}
                                </div>
                            )}
                        </div>
                    </button>
                ))}
                {filteredFriends.length > 0 ? (
                    filteredFriends.map((friend) => (
                    <button
                        key={friend.id}
                        type="button"
                        className={`list-group-item list-group-item-action d-flex align-items-center ${
                            friend.id === selectedFriendId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectFriend(friend)}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={getFullImageUrl(friend.avatar || DEFAULT_AVATAR)}
                                alt={friend.nickname || friend.username}
                                className="rounded-circle me-2"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            {friend.isOnline && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: '7px',
                                        width: '12px',
                                        height: '12px',
                                        backgroundColor: '#28a745',
                                        borderRadius: '50%',
                                        boxShadow: '0 0 0 2.5px white',
                                        display: 'block',
                                        flexShrink: 0,
                                    }}
                                ></span>
                            )}
                        </div>
                        <div className="flex-grow-1 text-start" style={{ overflow: 'hidden', minWidth: 0 }}>
                            <div style={{ 
                                overflow: 'hidden', 
                                textOverflow: 'ellipsis', 
                                whiteSpace: 'nowrap' 
                            }}>
                                <strong>{friend.nickname || friend.username}</strong>
                            </div>
                            {friend.signature && (
                                <div style={{ 
                                    fontSize: '0.85rem', 
                                    color: '#6c757d', 
                                    marginTop: '2px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    maxWidth: '100%'
                                }}>
                                    {friend.signature}
                                </div>
                            )}
                        </div>
                    </button>
                ))
            ) : friends.length === 0 && groups.length === 0 ? (
                <div
                    className="d-flex flex-column align-items-center justify-content-center text-muted"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <i className="bi bi-plus-circle-dotted" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>{t('friendList.noFriends')}</div>
                </div>
            ) : (
                <div
                    className="d-flex flex-column align-items-center justify-content-center text-muted"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <i className="bi bi-search" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>{t('friendList.noResults', { query: searchQuery })}</div>
                </div>
            )}
            </div>
        </div>
    );

};

export default FriendList;
