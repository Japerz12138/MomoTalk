import React from 'react';
import { useTranslation } from 'react-i18next';
import 'bootstrap/dist/css/bootstrap.min.css';
import UserMenu from './UserMenu';
import { DEFAULT_AVATAR } from '../constants';
import { getFullImageUrl } from '../utils/imageHelper';

const Sidebar = ({ showMenu, toggleMenu, onLogout, activeSection, onSectionChange, nickname, username, avatar, isMobile, onClose, unreadMessagesCount, friendRequests }) => {
    const { t } = useTranslation();
    // Calculate if there are unread messages
    const hasUnreadMessages = unreadMessagesCount && Object.values(unreadMessagesCount).some(count => count > 0);
    
    // Calculate if there are pending friend requests
    const hasPendingRequests = friendRequests && friendRequests.length > 0;
    return (
        <div 
            className={`d-flex flex-column flex-shrink-0 sidebar ${isMobile ? 'mobile-sidebar-content' : ''}`} 
            style={{ 
                width: isMobile ? '100%' : '4.5rem', 
                marginTop: isMobile ? '0' : 'var(--header-height, 69px)', 
                backgroundColor: '#495A6E',
                height: isMobile ? '100vh' : 'calc(100vh - var(--header-height, 69px))'
            }}
        >
            {/* Mobile user info at top */}
            {isMobile && (
                <div style={{ 
                    padding: '20px', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)'
                }}>
                    <div className="d-flex align-items-center">
                        <img
                            src={getFullImageUrl(avatar || DEFAULT_AVATAR)}
                            alt="Avatar"
                            className="rounded-circle me-3"
                            style={{
                                width: '48px',
                                height: '48px',
                                objectFit: 'cover',
                                border: '2px solid rgba(255, 255, 255, 0.2)'
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ 
                                color: '#FFFFFF', 
                                fontWeight: '600',
                                fontSize: '1rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {nickname}
                            </div>
                            <div style={{ 
                                color: '#A6ACB8', 
                                fontSize: '0.85rem',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                @{username}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <ul className={`nav nav-pills nav-flush flex-column ${isMobile ? 'text-start' : 'text-center'}`} style={{ flex: isMobile ? '1' : 'auto' }}>
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'chat' ? 'active' : ''}`}
                        onClick={() => {
                            onSectionChange('chat');
                            if (isMobile && onClose) onClose();
                        }}
                        style={{ position: 'relative' }}
                    >
                        <i className={`bi bi-chat-dots ${isMobile ? 'me-2' : ''}`} style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}></i>
                        {isMobile && <span>{t('sidebar.chats')}</span>}
                        {hasUnreadMessages && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: isMobile ? '50%' : '12px',
                                    right: isMobile ? '16px' : '12px',
                                    transform: isMobile ? 'translateY(-50%)' : 'none',
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#FF95AA',
                                    borderRadius: '50%',
                                    border: '2px solid #495A6E',
                                    display: 'block',
                                    flexShrink: 0,
                                }}
                            ></span>
                        )}
                    </a>
                </li>
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'friend-list' ? 'active' : ''}`}
                        onClick={() => {
                            onSectionChange('friend-list');
                            if (isMobile && onClose) onClose();
                        }}
                    >
                        <i className={`bi bi-people ${isMobile ? 'me-2' : ''}`} style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}></i>
                        {isMobile && <span>{t('sidebar.friends')}</span>}
                    </a>
                </li>
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'add-friend' ? 'active' : ''}`}
                        onClick={() => {
                            onSectionChange('add-friend');
                            if (isMobile && onClose) onClose();
                        }}
                        style={{ position: 'relative' }}
                    >
                        <i className={`bi bi-person-plus ${isMobile ? 'me-2' : ''}`} style={{ fontSize: isMobile ? '1.1rem' : '1.5rem' }}></i>
                        {isMobile && <span>{t('sidebar.addFriend')}</span>}
                        {hasPendingRequests && (
                            <span
                                style={{
                                    position: 'absolute',
                                    top: isMobile ? '50%' : '12px',
                                    right: isMobile ? '16px' : '12px',
                                    transform: isMobile ? 'translateY(-50%)' : 'none',
                                    width: '12px',
                                    height: '12px',
                                    backgroundColor: '#FF95AA',
                                    borderRadius: '50%',
                                    border: '2px solid #495A6E',
                                    display: 'block',
                                    flexShrink: 0,
                                }}
                            ></span>
                        )}
                    </a>
                </li>
            </ul>

            {/* Mobile menu items at bottom */}
            {isMobile ? (
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <ul className="nav nav-pills nav-flush flex-column text-start">
                        <li>
                            <a
                                href="#"
                                className={`nav-link py-3 ${activeSection === 'profile' ? 'active' : ''}`}
                                onClick={() => {
                                    onSectionChange('profile');
                                    if (onClose) onClose();
                                }}
                            >
                                <i className="bi bi-person-circle me-2" style={{ fontSize: '1.1rem' }}></i>
                                <span>Profile</span>
                            </a>
                        </li>
                        <li>
                            <a
                                href="#"
                                className={`nav-link py-3 ${activeSection === 'settings' ? 'active' : ''}`}
                                onClick={() => {
                                    onSectionChange('settings');
                                    if (onClose) onClose();
                                }}
                            >
                                <i className="bi bi-gear me-2" style={{ fontSize: '1.1rem' }}></i>
                                <span>Settings</span>
                            </a>
                        </li>
                        <li>
                            <a
                                href="#"
                                className="nav-link py-3"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onLogout();
                                    if (onClose) onClose();
                                }}
                                style={{ color: '#ff6b6b' }}
                            >
                                <i className="bi bi-box-arrow-right me-2" style={{ fontSize: '1.1rem' }}></i>
                                <span>{t('sidebar.logout')}</span>
                            </a>
                        </li>
                    </ul>
                </div>
            ) : (
                <UserMenu showMenu={showMenu} toggleMenu={toggleMenu} onLogout={onLogout} nickname={nickname} username={username} avatar={avatar} onSectionChange={onSectionChange} activeSection={activeSection} isMobile={isMobile}/>
            )}
        </div>
    );
};

export default Sidebar;