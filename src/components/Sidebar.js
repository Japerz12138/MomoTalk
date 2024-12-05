import React from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import UserMenu from './UserMenu';

const Sidebar = ({ showMenu, toggleMenu, onLogout, activeSection, onSectionChange, nickname, username }) => {
    return (
        <div className="d-flex flex-column flex-shrink-0 sidebar" style={{ width: '4.5rem', marginTop: '69px', backgroundColor: '#495A6E' }}>
            <ul className="nav nav-pills nav-flush flex-column mb-auto text-center">
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'chat' ? 'active' : ''}`}
                        onClick={() => onSectionChange('chat')}
                    >
                        <svg className="bi" width="24" height="24">
                            <use xlinkHref="#chat"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'friend-list' ? 'active' : ''}`}
                        onClick={() => onSectionChange('friend-list')}
                    >
                        <svg className="bi" width="24" height="24">
                            <use xlinkHref="#friend-list"/>
                        </svg>
                    </a>
                </li>
                <li>
                    <a
                        href="#"
                        className={`nav-link py-3 ${activeSection === 'add-friend' ? 'active' : ''}`}
                        onClick={() => onSectionChange('add-friend')}
                    >
                        <svg className="bi" width="24" height="24">
                            <use xlinkHref="#add-friend"/>
                        </svg>
                    </a>
                </li>
            </ul>
            <UserMenu showMenu={showMenu} toggleMenu={toggleMenu} onLogout={onLogout} nickname={nickname} username={username}/>
        </div>
    );
};

export default Sidebar;
