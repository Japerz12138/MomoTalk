import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function UserMenu({ onLogout, nickname, username, avatar }) {
    const [showMenu, setShowMenu] = useState(false);
    const DEFAULT_AVATAR =
        'https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small/default-avatar-photo-placeholder-profile-icon-vector.jpg';

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
                    width="40"
                    height="40"
                    className="rounded-circle"
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
                        onClick={(e) => {
                            e.preventDefault();
                            alert('Profile clicked');
                        }}
                    >
                        Profile
                    </a>
                </li>
                <li>
                    <a
                        className="dropdown-item rounded-2"
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            alert('Settings clicked');
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
