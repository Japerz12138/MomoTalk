const commonStyles = {
    form: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '300px',
    },
    input: {
        width: '100%',
        padding: '10px',
        margin: '5px 0',
        borderRadius: '5px',
        border: '1px solid #ddd',
    },
    button: {
        padding: '10px 20px',
        marginTop: '10px',
        border: 'none',
        backgroundColor: '#007bff',
        color: '#fff',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    secondaryButton: {
        padding: '10px 20px',
        marginTop: '5px',
        border: 'none',
        backgroundColor: '#6c757d',
        color: '#fff',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    captchaContainer: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        margin: '10px 0',
    },
    captcha: {
        backgroundColor: '#f1f1f1',
        padding: '10px',
        fontSize: '18px',
        fontWeight: 'bold',
        borderRadius: '5px',
    },
    captchaButton: {
        marginLeft: '10px',
        padding: '10px',
        border: 'none',
        backgroundColor: '#007bff',
        color: '#fff',
        borderRadius: '5px',
        cursor: 'pointer',
    },
    chatBox: {
        flex: 1,
        overflowY: 'scroll',
        marginBottom: '10px',
    },
    message: {
        backgroundColor: '#f1f1f1',
        margin: '5px 0',
        padding: '10px',
        borderRadius: '5px',
    },
    avatarContainer: {
        position: 'relative',
        cursor: 'pointer',
    },
    avatar: {
        borderRadius: '50%',
        width: '40px',
        height: '40px',
    },
    menu: {
        position: 'absolute',
        top: '50px',
        right: 0,
        backgroundColor: '#fff',
        border: '1px solid #ddd',
        borderRadius: '5px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        zIndex: 100,
    },
    menuItem: {
        padding: '10px',
        cursor: 'pointer',
        borderBottom: '1px solid #ddd',
    },
};

export default commonStyles;