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
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="32px"
                                                height="32px"
                                                viewBox="0 0 512 512"
                                                fill="#FF95AA"
                                                style={{marginBottom: '10px'}}
                                            >
                                                <g>
                                                    <path
                                                        d="M399.5,370.196c36.297-31.094,58.75-74.031,58.75-121.469c0-65.578-49.078-121.422-105.656-151.469 c-84.094-42.484-80.359-67.422-94.875-67.422s-10.781,24.938-94.859,67.422c-56.578,30.047-105.641,85.891-105.641,151.469 c0,47.438,22.438,90.375,58.719,121.469c33.906,29.047,160.328,56.359,148.781-66c-2.688-28.563,35.594-30.719,16.719,47.984 c-8.344,34.844-24.797,42.578-29.094,44.734c-4.313,2.156-4.313,5.375,5.375,6.453C317.281,409.992,366.094,398.821,399.5,370.196z"></path>
                                                    <path
                                                        d="M87.875,372.43c0,0-73.859,25.453-87.875,86.531c111.078,56.828,215.625-5.484,233.563-30.594 C120.813,423.32,87.875,372.43,87.875,372.43z"></path>
                                                    <path
                                                        d="M424.125,372.43c0,0-34.875,58.437-145.672,55.937c17.922,25.109,122.469,87.422,233.547,30.594 C497.984,397.883,424.125,372.43,424.125,372.43z"></path>
                                                </g>
                                            </svg>
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
