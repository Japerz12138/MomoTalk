import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import UserMenu from './components/UserMenu';
import FriendList from './components/FriendList';
import SearchAndAddFriend from './components/SearchAndAddFriend';
import ChatContainer from "./components/ChatContainer";
import FriendRequests from './components/FriendRequests';
import Sidebar from './components/Sidebar';
import './App.css';
import styles from './styles';

function App() {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [token, setToken] = useState(null);
    const [showRegister, setShowRegister] = useState(false);
    const [newUsername, setNewUsername] = useState('');
    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [friends, setFriends] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [dms, setDms] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        if (savedToken) {
            setToken(savedToken);
        }
    }, []);

    useEffect(() => {
        if (token) {
            fetchMessages();
            fetchFriends();
            fetchFriendRequests();
            const interval = setInterval(fetchMessages, 1000); // 定期刷新消息
            return () => clearInterval(interval); // 清理定时器
        }
    }, [token]);

    useEffect(() => {
        generateCaptcha();
    }, []);

    // Ignore ResizeObserver error Caused by LastPass
    const observer = new ResizeObserver(() => null);
    observer.observe(document.body);


    const fetchMessages = async () => {
        try {
            const response = await axios.get('http://localhost:5000/messages');
            setMessages(response.data);
        } catch (error) {
            console.error('Error fetching messages:', error);
        }
    };

    const fetchFriends = async () => {
        try {
            const response = await axios.get('http://localhost:5000/friends', {
                headers: { Authorization: token },
            });
            setFriends(response.data);
        } catch (error) {
            console.error('Error fetching friends:', error);
        }
    };


    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/login', { username, password });
            setToken(response.data.token);
            localStorage.setItem('token', response.data.token);
            setUsername(''); //Clear the error messages
        } catch (error) {
            setError('Invalid username or password.');
            console.error('Login error:', error.response ? error.response.data : error);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!newUsername.trim() || !newPassword.trim() || !confirmPassword.trim() || !nickname.trim()) {
            setError('All fields are required.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (captchaInput.trim().toUpperCase() !== captcha.toUpperCase()) {
            setError('Invalid captcha.');
            generateCaptcha();
            return;
        }

        try {
            await axios.post('http://localhost:5000/register', {
                username: newUsername,
                email,
                password: newPassword,
                nickname,
            });
            alert('Registration successful! You can now log in.');
            setShowRegister(false);
            handleRegFormReset();
        } catch (error) {
            console.error('Registration error:', error.response ? error.response.data : error);
        }
    };

    const handleAddFriend = async (username) => {
        try {
            await axios.post('http://localhost:5000/friend/add', { friendUsername: username }, {
                headers: { Authorization: token },
            });
            alert('Friend request sent');
            fetchFriends();
        } catch (error) {
            setError(error.response?.data?.error || 'Error adding friend');
        }
    };


    const handleAcceptFriend = async (friendId) => {
        try {
            await axios.post('http://localhost:5000/friend/accept', { friendId }, {
                headers: { Authorization: token }
            });
            alert('Friend request accepted');
            fetchFriends();
        } catch (error) {
            console.error('Error accepting friend:', error);
        }
    };

    const [friendRequests, setFriendRequests] = useState([]);

    const fetchFriendRequests = async () => {
        try {
            const response = await axios.get('http://localhost:5000/friend/requests', {
                headers: { Authorization: token },
            });
            setFriendRequests(response.data);
        } catch (error) {
            console.error('Error fetching friend requests:', error);
        }
    };

    const respondToFriendRequest = async (requestId, action) => {
        try {
            await axios.post(
                'http://localhost:5000/friend/respond',
                { requestId, action },
                { headers: { Authorization: token } }
            );
            if (action === 'accept') {
                fetchFriends();
            }
            fetchFriendRequests();
        } catch (error) {
            console.error(`Error responding to friend request: ${action}`, error);
        }
    };



    const handleRemoveFriend = async (friendId) => {
        try {
            await axios.post('http://localhost:5000/friend/remove', { friendId }, {
                headers: { Authorization: token },
            });
            fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const handleSelectFriend = async (friend, page = 1, limit = 20) => {
        setSelectedFriend(friend);
        try {
            const response = await axios.get(`http://localhost:5000/dm/${friend.id}`, {
                headers: { Authorization: token },
                params: { page, limit },
            });
            setDms(response.data);
        } catch (error) {
            console.error('Error fetching DMs:', error);
        }
    };


    const sendMessage = async (e) => {
        e.preventDefault();
        if (input.trim() && token) {
            try {
                await axios.post(
                    'http://localhost:5000/messages',
                    { text: input },
                    { headers: { Authorization: token } }
                );
                setInput('');
                fetchMessages();
            } catch (error) {
                console.error('Error sending message:', error);
            }
        }
    };

    const handleSendDM = async (e) => {
        e.preventDefault();
        if (input.trim() && token && selectedFriend) {
            try {
                await axios.post(
                    'http://localhost:5000/dm/send',
                    { receiverId: selectedFriend.id, text: input },
                    { headers: { Authorization: token } }
                );
                setInput('');
                handleSelectFriend(selectedFriend);
            } catch (error) {
                console.error('Error sending DM:', error);
            }
        }
    };

    const handleDeleteDMs = async () => {
        if (selectedFriend) {
            try {
                await axios.post(
                    'http://localhost:5000/dm/delete',
                    { friendId: selectedFriend.id },
                    { headers: { Authorization: token } }
                );
                alert('DM history deleted');
                setDms([]);
            } catch (error) {
                console.error('Error deleting DM history:', error);
            }
        }
    };

    const handleLogout = () => {
        setToken(null);
        setUsername('');
        setPassword('');
        setFriends([]);
        setSelectedFriend(null);
        setDms([]);
        setFriendRequests([]);
        setShowMenu(false);
        localStorage.removeItem('token');
    };


    const toggleMenu = () => {
        setShowMenu((prev) => !prev);
    };

    const handleRegFormReset = () => {
        setNewUsername('');
        setEmail('');
        setNewPassword('');
        setConfirmPassword('');
        setNickname('');
        setCaptchaInput('');
        setError('');
        generateCaptcha();
    };

    const switchToRegister = () => {
        setShowRegister(true);
        setUsername('');
        setPassword('');
        setError('');
    };

    const switchToLogin = () => {
        setShowRegister(false);
        handleRegFormReset();
        setError('');
    };

    const generateCaptcha = () => {
        const randomCaptcha = Math.random().toString(36).substring(2, 8).toUpperCase();
        setCaptcha(randomCaptcha);
    };

    return (
        <div style={styles.container}>
            {!token ? (
                showRegister ? (
                    <RegisterForm
                        newUsername={newUsername}
                        nickname={nickname}
                        newPassword={newPassword}
                        confirmPassword={confirmPassword}
                        captcha={captcha}
                        captchaInput={captchaInput}
                        onUsernameChange={(e) => setNewUsername(e.target.value)}
                        onEmailChange={(e) => setEmail(e.target.value)}
                        onNicknameChange={(e) => setNickname(e.target.value)}
                        onPasswordChange={(e) => setNewPassword(e.target.value)}
                        onConfirmPasswordChange={(e) => setConfirmPassword(e.target.value)}
                        onCaptchaInputChange={(e) => setCaptchaInput(e.target.value)}
                        onRegister={handleRegister}
                        onRefreshCaptcha={generateCaptcha}
                        onSwitchToLogin={() => switchToLogin()}
                        error={error}
                    />
                ) : (
                    <LoginForm
                        username={username}
                        password={password}
                        onUsernameChange={(e) => setUsername(e.target.value)}
                        onPasswordChange={(e) => setPassword(e.target.value)}
                        onLogin={handleLogin}
                        onSwitchToRegister={switchToRegister}
                        error={error}
                    />
                )
            ) : (
                <>
                    <div className="d-flex">
                        <Sidebar
                            showMenu={showMenu}
                            toggleMenu={toggleMenu}
                            onLogout={handleLogout}
                        />
                        <div className="flex-grow-1 d-flex flex-column">
                            <div className="list-group list-group-flush border-bottom scrollarea">
                                <FriendList friends={friends} onSelectFriend={handleSelectFriend}/>
                            </div>
                            <ChatContainer
                                messages={messages}
                                selectedFriend={selectedFriend}
                            />
                            <MessageInput
                                input={input}
                                onInputChange={(e) => setInput(e.target.value)}
                                onSendMessage={handleSendDM}
                            />
                        </div>
                        <div className="p-3">
                            <FriendRequests friendRequests={friendRequests}/>
                        </div>
                    </div>
                </>
            )}
        </div>
    );

}

export default App;
