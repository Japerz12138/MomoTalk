import React from 'react';
import styles from '../styles';
function RegisterForm({
                          newUsername,
                          nickname,
                          newPassword,
                          confirmPassword,
                          captcha,
                          captchaInput,
                          onUsernameChange,
                          onNicknameChange,
                          onPasswordChange,
                          onConfirmPasswordChange,
                          onCaptchaInputChange,
                          onRegister,
                          onRefreshCaptcha,
                          onSwitchToLogin,
                          error
                      }) {
    return (
        <form onSubmit={onRegister} style={styles.form}>
            <h2>Register</h2>
            <input
                type="text"
                value={newUsername}
                onChange={onUsernameChange}
                placeholder="Username"
                style={styles.input}
            />
            <input
                type="text"
                value={nickname}
                onChange={onNicknameChange}
                placeholder="Nickname"
                style={styles.input}
            />
            <input
                type="password"
                value={newPassword}
                onChange={onPasswordChange}
                placeholder="Password"
                style={styles.input}
            />
            <input
                type="password"
                value={confirmPassword}
                onChange={onConfirmPasswordChange}
                placeholder="Confirm Password"
                style={styles.input}
            />
            <div style={styles.captchaContainer}>
                <span style={styles.captcha}>{captcha}</span>
                <button type="button" onClick={onRefreshCaptcha} style={styles.captchaButton}>Refresh</button>
            </div>
            <input
                type="text"
                value={captchaInput}
                onChange={onCaptchaInputChange}
                placeholder="Enter Captcha"
                style={styles.input}
            />
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button type="submit" style={styles.button}>Register</button>
            <button type="button" onClick={onSwitchToLogin} style={styles.secondaryButton}>Back to Login</button>
        </form>
    );
}

export default RegisterForm;
