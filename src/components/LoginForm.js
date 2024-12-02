import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'

function LoginForm({
                       username,
                       password,
                       onUsernameChange,
                       onPasswordChange,
                       onLogin,
                       onSwitchToRegister,
                       error,
                   }) {
    const [localPassword, setLocalPassword] = useState(password || '');

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
                                            <h4 className="text-dark mb-4">Welcome Back!</h4>
                                        </div>
                                        <form className="user" onSubmit={onLogin}>
                                            <div className="mb-3">
                                                <input
                                                    className="form-control form-control-user"
                                                    type="text"
                                                    id="username"
                                                    placeholder="Enter Username"
                                                    value={username}
                                                    onChange={onUsernameChange}
                                                    required
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <input
                                                    className="form-control form-control-user"
                                                    type="password"
                                                    placeholder="Password"
                                                    value={password}
                                                    onChange={onPasswordChange}
                                                    required
                                                />
                                            </div>
                                            <button
                                                className="btn btn-primary d-block btn-user w-100"
                                                type="submit"
                                            >
                                                Login
                                            </button>
                                            <hr />
                                        </form>
                                        <div className="text-center">
                                            <a className="small" href="forgot-password.html">
                                                Forgot Password?
                                            </a>
                                        </div>
                                        <div className="text-center">
                                            <button
                                                type="button"
                                                className="btn btn-link small"
                                                onClick={onSwitchToRegister}
                                            >
                                                Create an Account!
                                            </button>
                                        </div>
                                        {error && <div
                                            className="p-3 text-danger-emphasis bg-danger-subtle border border-danger-subtle rounded-3">
                                            <i className="bi bi-exclamation-triangle"></i>
                                            {error}
                                        </div>}
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

export default LoginForm;
