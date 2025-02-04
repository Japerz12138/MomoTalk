import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { DEFAULT_AVATAR } from '../constants';

function UserMenu({ onLogout, nickname, username, avatar, onSectionChange }) {
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
        <div className="dropdown" style={{ position: 'relative' }}>
            <a
                href="#"
                className="d-flex align-items-center justify-content-center p-3 text-decoration-none dropdown-toggle"
                data-bs-toggle="dropdown"
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
                        width: '100%',
                        height: 'auto',
                        aspectRatio: '1',
                        objectFit: 'cover',
                    }}
                />
            </a>
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
                            closeMenu(); // Close menu after action
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
                            closeMenu(); // Close menu after action
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
                            closeMenu(); // Close menu after logout
                        }}
                    >
                        Logout
                    </a>
                </li>
            </ul>
        </div>
    );
}

export default UserMenu;
