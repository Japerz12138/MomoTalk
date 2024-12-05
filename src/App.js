import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoginForm from './components/LoginForm';
import RegisterForm from './components/RegisterForm';
import MessageList from './components/MessageList';
import MessageInput from './components/MessageInput';
import FriendList from './components/FriendList';
import SearchAndAddFriend from './components/SearchAndAddFriend';
import ChatContainer from "./components/ChatContainer";
import FriendRequests from './components/FriendRequests';
import Sidebar from './components/Sidebar';
import './App.css';
import styles from './styles';

import { io } from 'socket.io-client';

const socket = io('http://localhost:5000');

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
    const [activeSection, setActiveSection] = useState('chat');
    const [selectedChat, setSelectedChat] = useState(null);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUsername = localStorage.getItem('username');
        const savedNickname = localStorage.getItem('nickname');
        const savedUserId = localStorage.getItem('userId');
        // console.log('Loaded userId from localStorage:', savedUserId);
        // FOR DEBUG!

        if (savedToken) setToken(savedToken);
        if (savedUsername) setUsername(savedUsername);
        if (savedNickname) setNickname(savedNickname);
        if (savedUserId) setUserId(parseInt(savedUserId, 10));
    }, []);

    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchFriendRequests();
        }
        if (token && username) {

            fetchFriends();
            fetchFriendRequests();

            socket.emit('join_room', username);

            socket.on('receive_message', (message) => {
                setDms((prevDms) => [...prevDms, message]);
            });

            return () => {
                socket.off('receive_message');
                socket.disconnect();
            };

        }
    }, [token, username]);

    useEffect(() => {
        if (userId) {
            socket.emit('join_room', userId);

            socket.on('receive_message', (message) => {
                if (message.senderId === selectedFriend?.id || message.receiverId === selectedFriend?.id) {
                    setDms((prevDms) => [...prevDms, message]);
                }
            });

            return () => {
                socket.off('receive_message');
            };
        }
    }, [userId, selectedFriend]);

    useEffect(() => {
        generateCaptcha();
    }, []);

    // Ignore ResizeObserver error Caused by LastPass
    const observer = new ResizeObserver(() => null);
    observer.observe(document.body);

    const fetchMessages = async () => {
        try {
            const response = await axios.get('http://localhost:5000/messages', {
                headers: { Authorization: token },
            });
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
            const { token, username: loggedInUsername, nickname: loggedInNickname, userId: loggedInUserId } = response.data;

            setToken(token);
            setUsername(loggedInUsername);
            setNickname(loggedInNickname);
            setUserId(loggedInUserId);

            localStorage.setItem('token', token);
            localStorage.setItem('username', loggedInUsername);
            localStorage.setItem('nickname', loggedInNickname);
            localStorage.setItem('userId', loggedInUserId);
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

    const handleSelectFriend = async (friend) => {
        setSelectedFriend(friend);
        try {
            const response = await axios.get(`http://localhost:5000/dm/${friend.id}`, {
                headers: { Authorization: token },
            });

            // Fix the problem that all bubbles moved to left
            const messagesWithSelf = response.data.map((message) => ({
                ...message,
                self: message.senderId === userId,
            }));

            setDms(messagesWithSelf);
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

    const handleSendDM = (e) => {
        e.preventDefault();
        if (input.trim() && selectedFriend) {
            const newMessage = {
                senderId: userId,
                receiverId: selectedFriend.id,
                text: input,
                timestamp: new Date().toISOString(),
            };

            console.log('Sending message:', newMessage);

            socket.emit('send_message', newMessage);

            setDms((prevDms) => [...prevDms, { ...newMessage, self: true }]);

            setInput('');
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
        localStorage.removeItem('username');
        localStorage.removeItem('nickname');
        localStorage.removeItem('userId');
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
                    <div style={{display: 'flex', height: '100vh'}}>

                        <Sidebar
                            activeSection={activeSection}
                            onSectionChange={(section) => setActiveSection(section)}
                            onLogout={handleLogout}
                            nickname={nickname}
                            username={username}
                        />


                        <div
                            style={{
                                width: '300px',
                                backgroundColor: '#ffffff',
                                overflowY: 'auto',
                                flexShrink: 0,
                            }}
                        >
                            {activeSection === 'chat' && (
                                <MessageList
                                    messages={messages}
                                    onSelectMessage={(message) => {
                                        setSelectedChat(message.username);
                                        handleSelectFriend({ id: message.userId, username: message.username });
                                    }}
                                />
                            )}
                            {activeSection === 'friend-list' && (

                                <FriendList
                                    friends={friends}
                                    onSelectFriend={(friend) => {
                                        handleSelectFriend(friend);
                                    }}
                                />

                            )}
                            {activeSection === 'add-friend' && (
                                <>
                                    <FriendRequests
                                        friendRequests={friendRequests}
                                        onRespond={() => {}}
                                    />
                                    <SearchAndAddFriend
                                        token={token}
                                        onAddFriend={() => {}}
                                    />
                                </>
                            )}
                        </div>


                        <div
                            style={{
                                flex: 2,
                                display: 'flex',
                                flexDirection: 'column',
                                backgroundColor: '#fff',
                            }}
                        >
                            <ChatContainer
                                messages={selectedFriend ? dms : []}
                                currentChat={selectedFriend ? selectedFriend.username : 'Select a conversation'}
                            />
                            <MessageInput
                                input={input}
                                onInputChange={(e) => setInput(e.target.value)}
                                onSendMessage={selectedFriend ? handleSendDM : null}
                            />
                        </div>
                    </div>

                </>
            )}
        </div>
    );

}

export default App;
