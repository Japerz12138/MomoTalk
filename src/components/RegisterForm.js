// RegisterForm.js
import React from 'react';
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
                          error
                      }) {
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
                                        <h4 className="text-dark mb-4">Register Account</h4>
                                    </div>
                                    <form onSubmit={onRegister}>
                                        <input
                                            type="text"
                                            value={newUsername}
                                            onChange={onUsernameChange}
                                            placeholder="Username"
                                            style={styles.input}
                                        />
                                        <input
                                            type="text"
                                            value={email}
                                            onChange={onEmailChange}
                                            placeholder="Email"
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
                                            <button type="button" onClick={onRefreshCaptcha}
                                                    style={styles.captchaButton}>Refresh
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            value={captchaInput}
                                            onChange={onCaptchaInputChange}
                                            placeholder="Enter Captcha"
                                            style={styles.input}
                                        />
                                        {error && <p style={{color: 'red'}}>{error}</p>}
                                        <button
                                            className="btn btn-primary d-block btn-user w-100"
                                            type="submit"
                                            style={{marginTop: '10px'}}
                                        >
                                            Register
                                        </button>
                                        <hr/>
                                        <button className="btn btn-secondary d-block btn-user w-100"
                                                onClick={onSwitchToLogin}>Back to Login
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
    )
        ;
}

export default RegisterForm;