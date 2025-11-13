import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../styles';

function RegisterForm({
                          newUsername,
                          email,
                          nickname,
                          newPassword,
                          confirmPassword,
                          captcha,
                          captchaInput,
                          onUsernameChange,
                          onEmailChange,
                          onNicknameChange,
                          onPasswordChange,
                          onConfirmPasswordChange,
                          onCaptchaInputChange,
                          onRegister,
                          onRefreshCaptcha,
                          onSwitchToLogin,
                      }) {
    const { t } = useTranslation();
    const [error, setError] = useState('');

    const handleRegister = (e) => {
        e.preventDefault();

        // Password validation: at least 8 characters and at least one uppercase letter
        const passwordRegex = /^(?=.*[A-Z]).{8,}$/;

        if (!passwordRegex.test(newPassword)) {
            setError(t('register.passwordError'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError(t('register.passwordMismatch'));
            return;
        }

        // Clear error if validation passes
        setError('');
        onRegister(e); // Call the passed onRegister handler
    };

    return (
        <div
            className="container"
            style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: 'translateY(-50%)',
            }}
        >
            <div className="row justify-content-center">
                <div className="col-md-10 col-lg-9 col-xl-9 col-xxl-7">
                    <div className="card shadow-lg o-hidden border-0 my-5">
                        <div className="card-body p-0">
                            <div className="row">
                                <div className="col-lg-12">
                                    <div className="p-5">
                                        <div className="text-center">
                                            <h4 className="text-dark mb-4">{t('register.title')}</h4>
                                        </div>
                                        <form onSubmit={handleRegister}>
                                            <input
                                                type="text"
                                                value={newUsername}
                                                onChange={onUsernameChange}
                                                placeholder={t('register.username')}
                                                style={styles.input}
                                            />
                                            <input
                                                type="text"
                                                value={email}
                                                onChange={onEmailChange}
                                                placeholder={t('register.email')}
                                                style={styles.input}
                                            />
                                            <input
                                                type="text"
                                                value={nickname}
                                                onChange={onNicknameChange}
                                                placeholder={t('register.nickname')}
                                                style={styles.input}
                                            />
                                            <input
                                                type="password"
                                                value={newPassword}
                                                onChange={onPasswordChange}
                                                placeholder={t('register.password')}
                                                style={styles.input}
                                            />
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={onConfirmPasswordChange}
                                                placeholder={t('register.confirmPassword')}
                                                style={styles.input}
                                            />
                                            <div style={styles.captchaContainer}>
                                                <span style={styles.captcha}>{captcha}</span>
                                                <button type="button" onClick={onRefreshCaptcha}
                                                        style={styles.captchaButton}>{t('register.refresh')}
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                value={captchaInput}
                                                onChange={onCaptchaInputChange}
                                                placeholder={t('register.captcha')}
                                                style={styles.input}
                                            />
                                            {error && <p style={{ color: 'red' }}>{error}</p>}
                                            <button
                                                className="btn btn-primary d-block btn-user w-100"
                                                type="submit"
                                                style={{ marginTop: '10px' }}
                                            >
                                                {t('register.register')}
                                            </button>
                                            <hr />
                                            <button className="btn btn-secondary d-block btn-user w-100"
                                                    onClick={onSwitchToLogin}>{t('register.backToLogin')}
                                            </button>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RegisterForm;
