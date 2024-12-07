import React, { useState, useEffect, useRef } from 'react';
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
import ToastContainer from "./components/ToastContainer";
import UserProfile from "./components/UserProfile";
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
    const [avatar, setAvatar] = useState('');
    const toastRef = useRef();
    const [socketInstance, setSocket] = useState(null);

    useEffect(() => {
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    }, [token]);

    useEffect(() => {
        const savedToken = localStorage.getItem('token');
        const savedUsername = localStorage.getItem('username');
        const savedNickname = localStorage.getItem('nickname');
        const savedUserId = localStorage.getItem('userId');
        const savedAvatar = localStorage.getItem('avatar');
        // console.log('Loaded userId from localStorage:', savedUserId);
        // FOR DEBUG!
        if (savedToken) {
            setToken(savedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }

        if (savedUsername) setUsername(savedUsername);
        if (savedNickname) setNickname(savedNickname);
        if (savedUserId) setUserId(parseInt(savedUserId, 10));
        if (savedAvatar) setAvatar(savedAvatar);
    }, []);

    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchFriendRequests();
            if (userId) {
                socket.emit('join_room', userId);
                console.log(`Socket connected for userId: ${userId}`);
            }
        }
    }, [token, userId]);

    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.error('Session expired or unauthorized. Logging out.');
                    handleLogout();
                }
                return Promise.reject(error);
            }
        );


        return () => axios.interceptors.response.eject(interceptor);
    }, []);


    useEffect(() => {
        if (token && username) {
            socket.emit('join_room', username);
            console.log(`Joined room for user: ${username}`);

            socket.on('receive_message', (message) => {
                console.log('Received message:', message);
                setDms((prevDms) => [...prevDms, message]);
            });

            socket.on('receive_friend_request', ({ senderId, senderUsername }) => {
                fetchFriendRequests();
                fetchFriends();
            });

            return () => {
                socket.off('receive_message');
                socket.off('receive_friend_request');
            };
        }
    }, [token, username]);

    useEffect(() => {
        if (userId) {
            socket.emit('join_room', userId);

            socket.on('receive_message', (message) => {
                setDms((prevDms) => [
                    ...prevDms,
                    {
                        ...message,
                        avatar: selectedFriend?.avatar || "https://via.placeholder.com/32",
                    },
                ]);
            });

            return () => {
                socket.off('receive_message');
            };
        }
    }, [userId, selectedFriend]);

    useEffect(() => {
        socket.on('receive_friend_request', ({ senderId, senderUsername }) => {
            handleShowToast("New Friend!?", `${senderUsername} sent you a friend request!`);
            fetchFriendRequests();
            fetchFriends();
        });

        return () => {
            socket.off('receive_friend_request');
        };
    }, []);

    useEffect(() => {
        socket.on('friend_request_responded', ({ receiverId, action }) => {
            if (action === 'accept') {
                handleShowToast("Yay!", "Your friend request was accepted!");
                fetchFriends();
            } else if (action === 'reject') {
                handleShowToast(":(", "Your friend request was rejected!");
            }
        });

        return () => {
            socket.off('friend_request_responded');
        };
    }, []);

    useEffect(() => {
        if (socketInstance) {
            socketInstance.on('update_friend_list', () => {
                console.log('Received update_friend_list event');
                fetchFriends();
            });

            return () => {
                socketInstance.off('update_friend_list');
            };
        }
    }, [socketInstance]);

    useEffect(() => {
        generateCaptcha();
    }, []);

    // Ignore ResizeObserver error Caused by LastPass
    const observer = new ResizeObserver(() => null);
    observer.observe(document.body);

    const fetchMessages = async () => {
        if (!token) return;
        try {
            const response = await axios.get('http://localhost:5000/messages');
            setMessages(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                console.error('Unauthorized! Clearing token.');
                handleLogout();
            } else {
                console.error('Error fetching messages:', error);
            }
        }
    };

    const handleShowToast = (title, message) => {
        toastRef.current.addToast(title, message);
    };

    const fetchFriends = async () => {
        if (!token) return;
        try {
            const response = await axios.get('http://localhost:5000/friends');
            setFriends(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                console.error('Unauthorized! Clearing token.');
                handleLogout();
            } else {
                console.error('Error fetching friends:', error);
            }
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post('http://localhost:5000/login', { username, password });
            const { token, username: loggedInUsername, nickname: loggedInNickname, userId: loggedInUserId, avatar } = response.data;

            setToken(token);
            setUsername(loggedInUsername);
            setNickname(loggedInNickname);
            setUserId(loggedInUserId);
            setAvatar(avatar);

            localStorage.setItem('token', token);
            localStorage.setItem('username', loggedInUsername);
            localStorage.setItem('nickname', loggedInNickname);
            localStorage.setItem('userId', loggedInUserId);
            localStorage.setItem('avatar', avatar);

            //init socket for current user
            const newSocket = initializeSocket(loggedInUserId);
            setSocket(newSocket); // Save socket instance
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
            const response = await axios.post('http://localhost:5000/friend/add', { friendUsername: username }, {
                headers: { Authorization: token },
            });

            handleShowToast("Success", "Friend request sent!");
            fetchFriends();

            // Notify the friend
            const receiverId = response.data.receiverId;
            socket.emit('send_friend_request', {
                senderId: userId,
                receiverId,
                senderUsername: username,
            });
        } catch (error) {
            console.error('Error adding friend:', error.response?.data?.error || error);
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
        if (!token) return;
        try {
            const response = await axios.get('http://localhost:5000/friend/requests');
            setFriendRequests(response.data);
        } catch (error) {
            if (error.response?.status === 401) {
                console.error('Unauthorized! Clearing token.');
                handleLogout();
            } else {
                console.error('Error fetching friend requests:', error);
            }
        }
    };

    const respondToFriendRequest = async (requestId, action) => {
        try {
            const response = await axios.post(
                'http://localhost:5000/friend/respond',
                { requestId, action },
                { headers: { Authorization: token } }
            );

            handleShowToast(
                action === 'accept' ? 'Success' : 'Notification',
                action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected.'
            );

            fetchFriendRequests();
            if (action === 'accept') {
                fetchFriends();
            }

            const senderId = response.data.senderId;
            socket.emit('respond_friend_request', {
                senderId,
                receiverId: userId,
                action,
            });
        } catch (error) {
            handleShowToast("Error", "Failed to respond to friend request.");
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
        if (!token || !friend) return;

        try {
            setSelectedFriend(friend);
            const response = await axios.get(`http://localhost:5000/dm/${friend.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const messagesWithAvatar = response.data.map((message) => ({
                ...message,
                self: message.senderId === userId,
                avatar: message.senderId === userId ? 'https://via.placeholder.com/100' : friend.avatar,
            }));

            setDms(messagesWithAvatar);
        } catch (error) {
            if (error.response?.status === 401) {
                console.error('Unauthorized! Clearing token.');
                handleLogout();
            } else {
                console.error('Error fetching DMs:', error);
            }
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
                avatar: nickname,
            };

            console.log('Sending message:', newMessage); //for debug

            socket.emit('send_message', newMessage);

            setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

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
        if (socketInstance) {
            socketInstance.emit('leave_room', userId);
            socketInstance.removeAllListeners();
            socketInstance.disconnect();
            setSocket(null);
        }

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

        setActiveSection('login');
    };

    const initializeSocket = (userId) => {
        const newSocket = io('http://localhost:5000');
        newSocket.emit('join_room', userId);
        console.log(`Socket initialized for userId: ${userId}`);
        return newSocket;
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

    //IF ADD NAVIGATION ITEM, CHANGE THIS AS WELL!
    const handleSectionChange = (section) => {
        setActiveSection(section);

        if (section === 'friend-list' && friends.length === 0) {
            fetchFriends();
        } else if (section === 'add-friend' && friendRequests.length === 0) {
            fetchFriendRequests();
        } else if (section === 'chat' && messages.length === 0) {
            fetchMessages();
        }
    };


    return (
        <div style={styles.container}>
            <ToastContainer ref={toastRef} />
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
                        onSwitchToLogin={switchToLogin}
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
                            onSectionChange={handleSectionChange}
                            onLogout={handleLogout}
                            nickname={nickname}
                            username={username}
                            avatar={avatar}
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
                                <FriendList
                                    friends={friends}
                                    onSelectFriend={(friend) => {
                                        handleSelectFriend(friend);
                                    }}
                                />
                            )}
                            {activeSection === 'friend-list' && (
                                <FriendList
                                    friends={friends}
                                    onSelectFriend={(friend) => {
                                        setSelectedFriend(friend);
                                    }}
                                />
                            )}
                            {activeSection === 'add-friend' && (
                                <>
                                    <FriendRequests
                                        friendRequests={friendRequests}
                                        onRespond={respondToFriendRequest}
                                    />
                                    <SearchAndAddFriend token={token} onAddFriend={handleAddFriend}/>
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
                            {activeSection === 'chat' && selectedFriend && (
                                <>
                                    <ChatContainer
                                        messages={selectedFriend ? dms : []}
                                        currentChat={selectedFriend ? selectedFriend.username : 'Select a conversation'}
                                    />
                                    <MessageInput
                                        input={input}
                                        onInputChange={(e) => setInput(e.target.value)}
                                        onSendMessage={selectedFriend ? handleSendDM : null}
                                    />
                                </>
                            )}
                            {activeSection === 'friend-list' && selectedFriend && (
                                <UserProfile
                                    user={selectedFriend}
                                    isOwnProfile={false}
                                    onSendMessage={() => {
                                        setActiveSection('chat');
                                        handleSelectFriend(selectedFriend);
                                    }}
                                    onRemoveFriend={() => {
                                        handleRemoveFriend(selectedFriend.id);
                                        setSelectedFriend(null);
                                    }}
                                />
                            )}
                            {activeSection === 'profile' && (
                                <UserProfile
                                    user={selectedFriend}
                                    isOwnProfile={false}
                                    onSendMessage={() => {
                                        setActiveSection('chat');
                                        handleSelectFriend(selectedFriend);
                                    }}
                                    onRemoveFriend={() => {
                                        handleRemoveFriend(selectedFriend.id);
                                        setSelectedFriend(null);
                                    }}
                                />
                            )}
                        </div>
                    </div>


                </>
            )}
        </div>
    );

}

export default App;