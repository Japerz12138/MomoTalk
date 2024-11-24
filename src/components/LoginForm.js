import styles from '../styles';

function LoginForm({ username, password, onUsernameChange, onPasswordChange, onLogin, onSwitchToRegister, error}) {
    return (
        <form onSubmit={onLogin} style={styles.form}>
            <h2>Login</h2>
            <input
                type="text"
                value={username}
                onChange={onUsernameChange}
                placeholder="Username"
                style={styles.input}
            />
            <input
                type="password"
                value={password}
                onChange={onPasswordChange}
                placeholder="Password"
                style={styles.input}
            />
            <button type="submit" style={styles.button}>Login</button>
            <button type="button" onClick={onSwitchToRegister} style={styles.secondaryButton}>
                Register
            </button>
            {error && <p style={{color : 'red'}} >{error}</p>}
        </form>
    );
}

export default LoginForm;
