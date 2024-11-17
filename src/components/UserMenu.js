import React from 'react';
import styles from '../styles';

function UserMenu({ showMenu, toggleMenu, onLogout }) {
    return (
        <div style={styles.avatarContainer} onClick={toggleMenu}>
            <img src="https://via.placeholder.com/40" alt="Avatar" style={styles.avatar} />
            {showMenu && (
                <div style={styles.menu}>
                    <p style={styles.menuItem} onClick={() => alert('Profile clicked')}>Profile</p>
                    <p style={styles.menuItem} onClick={() => alert('Settings clicked')}>Settings</p>
                    <p style={styles.menuItem} onClick={onLogout}>Logout</p>
                </div>
            )}
        </div>
    );
}

export default UserMenu;
