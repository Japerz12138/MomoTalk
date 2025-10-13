import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { DEFAULT_AVATAR } from '../constants';

function UserMenu({ onLogout, nickname, username, avatar, onSectionChange, isMobile }) {
    const [showMenu, setShowMenu] = useState(false);

    const toggleMenu = () => {
        setShowMenu((prev) => !prev);
    };

    const closeMenu = () => {
        setShowMenu(false);
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.dropdown')) {
                closeMenu();
            }
        };

        document.addEventListener('click', handleClickOutside);
        return () => {
            document.removeEventListener('click', handleClickOutside);
        };
    }, []);

    return (
        <>
            <div className={isMobile ? '' : 'dropdown'} style={{ position: 'relative' }}>
                <a
                    href="#"
                    className={`d-flex align-items-center justify-content-center p-3 text-decoration-none ${!isMobile ? 'dropdown-toggle' : ''}`}
                    {...(!isMobile && { 'data-bs-toggle': 'dropdown' })}
                    aria-expanded={showMenu}
                    onClick={(e) => {
                        e.preventDefault();
                        toggleMenu();
                    }}
                    style={{ cursor: 'pointer' }}
                >
                    <img
                        src={avatar || DEFAULT_AVATAR}
                        alt="Avatar"
                        className="rounded-circle"
                        style={{
                            width: isMobile ? '32px' : '100%',
                            height: isMobile ? '32px' : 'auto',
                            aspectRatio: '1',
                            objectFit: 'cover',
                        }}
                    />
                </a>
                
                {/* Desktop dropdown menu */}
                {!isMobile && (
                    <ul
                        className={`dropdown-menu text-small shadow gap-1 p-2 rounded-3 ${showMenu ? 'show' : ''}`}
                        style={{
                            display: showMenu ? 'block' : 'none',
                            position: 'absolute',
                            bottom: '100%',
                            left: '10px',
                            zIndex: 1050,
                        }}
                    >
                        <div className="px-3 py-2">
                            <strong className="d-block" style={{ fontSize: '1rem' }}>
                                {nickname}
                            </strong>
                            <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                @{username}
                            </span>
                        </div>
                        <li>
                            <a
                                className="dropdown-item rounded-2"
                                href="#"
                                onClick={() => {
                                    onSectionChange('profile');
                                    closeMenu();
                                }}
                            >
                                Profile
                            </a>
                        </li>
                        <li>
                            <a
                                className="dropdown-item rounded-2"
                                href="#"
                                onClick={() => {
                                    onSectionChange('settings');
                                    closeMenu();
                                }}
                            >
                                Settings
                            </a>
                        </li>
                        <li>
                            <hr className="dropdown-divider" />
                        </li>
                        <li>
                            <a
                                className="dropdown-item rounded-2 logout"
                                href="#"
                                onClick={(e) => {
                                    e.preventDefault();
                                    onLogout();
                                    closeMenu();
                                }}
                            >
                                Logout
                            </a>
                        </li>
                    </ul>
                )}
            </div>

            {/* Mobile bottom sheet */}
            {isMobile && showMenu && (
                <>
                    <div 
                        className="mobile-menu-overlay"
                        onClick={closeMenu}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.5)',
                            zIndex: 1060,
                            animation: 'fadeIn 0.2s ease-in-out'
                        }}
                    />
                    <div 
                        className="mobile-bottom-sheet"
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            backgroundColor: 'white',
                            borderTopLeftRadius: '20px',
                            borderTopRightRadius: '20px',
                            boxShadow: '0 -4px 20px rgba(0, 0, 0, 0.15)',
                            zIndex: 1061,
                            animation: 'slideUp 0.3s ease-out',
                            paddingBottom: 'env(safe-area-inset-bottom)'
                        }}
                    >
                        <div style={{ padding: '20px' }}>
                            {/* Handle bar */}
                            <div style={{
                                width: '40px',
                                height: '4px',
                                backgroundColor: '#dee2e6',
                                borderRadius: '2px',
                                margin: '0 auto 20px'
                            }} />
                            
                            {/* User info */}
                            <div className="d-flex align-items-center mb-3">
                                <img
                                    src={avatar || DEFAULT_AVATAR}
                                    alt="Avatar"
                                    className="rounded-circle me-3"
                                    style={{
                                        width: '48px',
                                        height: '48px',
                                        objectFit: 'cover'
                                    }}
                                />
                                <div>
                                    <strong className="d-block" style={{ fontSize: '1.1rem' }}>
                                        {nickname}
                                    </strong>
                                    <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                        @{username}
                                    </span>
                                </div>
                            </div>
                            
                            <hr className="my-3" />
                            
                            {/* Menu items */}
                            <div className="list-group list-group-flush">
                                <button
                                    className="list-group-item list-group-item-action border-0 d-flex align-items-center"
                                    onClick={() => {
                                        onSectionChange('profile');
                                        closeMenu();
                                    }}
                                    style={{ padding: '12px 8px' }}
                                >
                                    <i className="bi bi-person-circle me-3" style={{ fontSize: '1.3rem' }}></i>
                                    <span style={{ fontSize: '1rem' }}>Profile</span>
                                </button>
                                <button
                                    className="list-group-item list-group-item-action border-0 d-flex align-items-center"
                                    onClick={() => {
                                        onSectionChange('settings');
                                        closeMenu();
                                    }}
                                    style={{ padding: '12px 8px' }}
                                >
                                    <i className="bi bi-gear me-3" style={{ fontSize: '1.3rem' }}></i>
                                    <span style={{ fontSize: '1rem' }}>Settings</span>
                                </button>
                                <button
                                    className="list-group-item list-group-item-action border-0 d-flex align-items-center text-danger"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onLogout();
                                        closeMenu();
                                    }}
                                    style={{ padding: '12px 8px' }}
                                >
                                    <i className="bi bi-box-arrow-right me-3" style={{ fontSize: '1.3rem' }}></i>
                                    <span style={{ fontSize: '1rem' }}>Logout</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}

export default UserMenu;
