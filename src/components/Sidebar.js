import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import UserMenu from './UserMenu';

const Sidebar = ({ showMenu, toggleMenu, onLogout }) => {
    return (
        <div className="d-flex flex-column flex-shrink-0 sidebar" style={{ width: '4.5rem', marginTop: '69px', backgroundColor: '#495A6E' }}>
            <ul className="nav nav-pills nav-flush flex-column mb-auto text-center">
                <li className="nav-item">
                    <a href="#" className="nav-link active py-3 border-bottom rounded-0" title="Chat" style={{ backgroundColor: '#65778D', color: '#FFFFFF' }}>
                        <svg className="bi" width="24" height="24" role="img" aria-label="Chat">
                            <use xlinkHref="#chat" />
                        </svg>
                    </a>
                </li>
                <li className="nav-item">
                    <a href="#" className="nav-link py-3 border-bottom rounded-0" title="Friend List" style={{ color: '#A6ACB8' }}>
                        <svg className="bi" width="24" height="24" role="img" aria-label="Friend List">
                            <use xlinkHref="#friend-list" />
                        </svg>
                    </a>
                </li>
                <li className="nav-item">
                    <a href="#" className="nav-link py-3 border-bottom rounded-0" title="Add Friend" style={{ color: '#A6ACB8' }}>
                        <svg className="bi" width="24" height="24" role="img" aria-label="Add Friend">
                            <use xlinkHref="#add-friend" />
                        </svg>
                    </a>
                </li>
            </ul>
            <UserMenu showMenu={showMenu} toggleMenu={toggleMenu} onLogout={onLogout} />
        </div>
    );
};

export default Sidebar;
