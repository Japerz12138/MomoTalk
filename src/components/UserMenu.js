import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';

function UserMenu({ onLogout, nickname, username}) {
    const [showMenu, setShowMenu] = useState(false);

    const toggleMenu = () => {
        setShowMenu((prev) => !prev);
    };

    return (
        <div className="dropdown" style={{ position: 'relative' }}>
            <a
                href="#"
                className="d-flex align-items-center justify-content-center p-3 text-decoration-none dropdown-toggle"
                data-bs-toggle="dropdown"
                aria-expanded={showMenu}
                onClick={toggleMenu}
                style={{ cursor: 'pointer' }}
            >
                <img
                    src="https://via.placeholder.com/40" // Still a placeholder for now
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
                    <strong className="d-block" style={{fontSize: '1rem'}}>{nickname}</strong>
                    <span className="text-muted" style={{fontSize:'0.9rem'}}>@{username}</span>
                </div>
                <li>
                    <a className="dropdown-item rounded-2" href="#" onClick={() => alert('Profile clicked')}>
                        Profile
                    </a>
                </li>
                <li>
                    <a className="dropdown-item rounded-2" href="#" onClick={() => alert('Settings clicked')}>
                        Settings
                    </a>
                </li>
                <li>
                    <hr className="dropdown-divider"/>
                </li>
                <li>
                    <a className="dropdown-item rounded-2 logout" href="#" onClick={onLogout}>
                        Logout
                    </a>
                </li>
            </ul>
        </div>
    );
}

export default UserMenu;
