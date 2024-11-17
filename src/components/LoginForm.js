import styles from '../styles';

function LoginForm({ username, password, onUsernameChange, onPasswordChange, onLogin, onSwitchToRegister }) {
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
        </form>
    );
}

export default LoginForm;
