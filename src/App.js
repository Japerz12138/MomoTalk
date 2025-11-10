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
import SettingsPage from "./components/SettingsPage";
import EmojiPanel from "./components/EmojiPanel";
import './App.css';
import styles from './styles';
import { DEFAULT_AVATAR } from './constants';

import { io } from 'socket.io-client';

const socket = io(process.env.REACT_APP_SERVER_DOMAIN);

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
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(
        JSON.parse(localStorage.getItem('unreadMessagesCount')) || {}
    );
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showEmojiPanel, setShowEmojiPanel] = useState(false);
    
    // Mobile-specific states
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Handle window resize for mobile detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
            if (window.innerWidth > 768) {
                setSidebarOpen(false);
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Set CSS variable for header height
    useEffect(() => {
        const updateHeaderHeight = () => {
            const header = document.getElementById('main-header');
            if (header) {
                const height = header.offsetHeight;
                document.documentElement.style.setProperty('--header-height', `${height}px`);
            }
        };

        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => window.removeEventListener('resize', updateHeaderHeight);
    }, []);

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
        else setAvatar(DEFAULT_AVATAR);
    }, []);

    // Join room only once when userId is available
    useEffect(() => {
        if (userId) {
            socket.emit('join_room', userId);
            console.log(`Socket connected for userId: ${userId}`);
        }
    }, [userId]);

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

    // Fetch friends and requests when token is available
    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchFriendRequests();
        }
    }, [token]);

    // Handle incoming messages - NO join_room here!
    useEffect(() => {
        if (!userId) return;

        const handleReceiveMessage = (message) => {
            console.log('Received message:', message);

            //Check Local Storge notification settings
            const isInternalNotificationEnabled = JSON.parse(localStorage.getItem("internalNotificationEnabled")) || false;

            if (Notification.permission === 'granted' && isInternalNotificationEnabled) {
                // Show appropriate notification text based on message type
                const notificationBody = message.text || (message.imageUrl ? '[Image]' : 'New message');
                const notification = new Notification(`New message from ${message.nickname || 'Unknown'}`, {
                    body: notificationBody,
                    icon: message.avatar || DEFAULT_AVATAR,
                });

                notification.onclick = () => {
                    window.focus();
                };
            }

            const friendId = message.senderId === userId ? message.receiverId : message.senderId;

            setFriends((prevFriends) => {
                const senderFriend = prevFriends.find((friend) => friend.id === friendId);
                
                const updatedMessage = {
                    ...message,
                    avatar: senderFriend ? senderFriend.avatar : DEFAULT_AVATAR,
                    self: message.senderId === userId,
                };

                // Update unread count if not viewing this friend's chat
                if (!selectedFriend || friendId !== selectedFriend.id) {
                    setUnreadMessagesCount((prev) => {
                        const updated = {
                            ...prev,
                            [friendId]: (prev[friendId] || 0) + 1,
                        };
                        localStorage.setItem('unreadMessagesCount', JSON.stringify(updated));
                        return updated;
                    });
                } else {
                    setDms((prevDms) => [...prevDms, updatedMessage]);
                }

                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, message];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });

                return prevFriends.map((friend) =>
                    friend.id === friendId
                        ? {
                            ...friend,
                            lastMessage: message.text || (message.imageUrl ? '[Image]' : ''),
                            lastMessageTime: message.timestamp,
                            imageUrl: message.imageUrl,
                            avatar: senderFriend ? senderFriend.avatar : friend.avatar,
                        }
                        : friend
                );
            });
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
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

    //User online status
    useEffect(() => {
        socket.on('friend_status_update', ({ friendId, isOnline }) => {
            setFriends((prevFriends) =>
                prevFriends.map((friend) =>
                    friend.id === friendId && friend.isOnline !== isOnline //Prevent Loop respones
                        ? { ...friend, isOnline }
                        : friend
                )
            );
        });

        // Handle batch status updates
        socket.on('friends_status_response', (statusUpdates) => {
            setFriends((prevFriends) =>
                prevFriends.map((friend) => {
                    const update = statusUpdates.find(s => s.friendId === friend.id);
                    return update ? { ...friend, isOnline: update.isOnline } : friend;
                })
            );
        });

        return () => {
            socket.off('friend_status_update');
            socket.off('friends_status_response');
        };
    }, []);

    // Request friends status when page becomes visible again
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (!document.hidden && friends.length > 0) {
                const friendIds = friends.map(f => f.id);
                socket.emit('request_friends_status', friendIds);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [friends]);

    useEffect(() => {
        if (activeSection === 'friend-list') {
            fetchFriends();
        }
    }, [activeSection]);

    useEffect(() => {
        generateCaptcha();
    }, []);

    //Check if have broswer notification permission
    useEffect(() => {
        const notificationDismissed = localStorage.getItem('notificationDismissed');
        if (Notification.permission === 'default' && !notificationDismissed) {
            setShowNotificationModal(true);
        }
    }, []);

    const handleRequestNotificationPermission = () => {
        Notification.requestPermission().then((permission) => {
            setShowNotificationModal(false);
            console.log(`Notification permission: ${permission}`);
        });
    };

    const handleDismissNotification = () => {
        setShowNotificationModal(false);
        localStorage.setItem('notificationDismissed', 'true');
    };
    //Notification check function ends

    // Ignore ResizeObserver error Caused by LastPass
    const observer = new ResizeObserver(() => null);
    observer.observe(document.body);

    const fetchMessages = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/messages`);
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

    const handleUpdatePassword = async (oldPassword, newPassword, confirmPassword) => {
        if (newPassword !== confirmPassword) {
            alert("New passwords do not match!");
            return;
        }

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                { oldPassword, newPassword },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert(response.data.message);
            handleLogout();
        } catch (error) {
            alert(error.response?.data?.error || "Failed to update password.");
        }
    };

    const toggleDarkMode = () => {
        setIsDarkMode((prev) => !prev);
    };

    const toggleAutoMode = () => {
        setIsAutoMode((prev) => !prev);
    };

    // Mobile event handlers
    const toggleSidebar = () => {
        setSidebarOpen(!sidebarOpen);
    };

    const closeSidebar = () => {
        setSidebarOpen(false);
    };

    // Handle friend selection for mobile
    const handleSelectFriendMobile = (friend) => {
        handleSelectFriend(friend);
        if (isMobile) {
            setSidebarOpen(false);
        }
    };

    const fetchFriends = async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/friends`);
            setFriends(response.data);
            
            // Request fresh online status after fetching friends
            if (response.data.length > 0) {
                const friendIds = response.data.map(f => f.id);
                socket.emit('request_friends_status', friendIds);
            }
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
            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/login`, { username, password });
            const { token, username: loggedInUsername, nickname: loggedInNickname, userId: loggedInUserId, avatar } = response.data;

            setToken(token);
            setUsername(loggedInUsername);
            setNickname(loggedInNickname);
            setUserId(loggedInUserId);
            setAvatar(avatar || DEFAULT_AVATAR);

            localStorage.setItem('token', token);
            localStorage.setItem('username', loggedInUsername);
            localStorage.setItem('nickname', loggedInNickname);
            localStorage.setItem('userId', loggedInUserId);
            localStorage.setItem('avatar', avatar || DEFAULT_AVATAR);

            //init socket for current user
            const newSocket = initializeSocket(loggedInUserId);
            setSocket(newSocket); // Save socket instance

            setActiveSection('chat');
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
            await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/register`, {
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
            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/add`, { friendUsername: username }, {
                headers: { Authorization: `Bearer ${token}` },
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
            await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/accept`, { friendId }, {
                headers: { Authorization: `Bearer ${token}` }
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
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/requests`);
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
                `${process.env.REACT_APP_SERVER_DOMAIN}/friend/respond`,
                { requestId, action },
                { headers: { Authorization: `Bearer ${token}` } }
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
            await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/remove`, { friendId }, {
                headers: { Authorization: `Bearer ${token}` },
            });
            fetchFriends();
        } catch (error) {
            console.error('Error removing friend:', error);
        }
    };

    const handleSelectFriend = async (friend) => {
        if (!token || !friend) return;

        const selected = friends.find((f) => f.id === friend.id);
        if (!selected) return;

        setSelectedFriend(friend);

        setUnreadMessagesCount((prev) => {
            const updated = { ...prev, [friend.id]: 0 };
            localStorage.setItem('unreadMessagesCount', JSON.stringify(updated));
            return updated;
        });

        try {
            setSelectedFriend(friend);
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/dm/${friend.id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            const messagesWithAvatar = response.data.map((message) => ({
                ...message,
                self: message.senderId === userId,
                avatar: message.senderId === userId ? DEFAULT_AVATAR : friend.avatar,
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
                    `${process.env.REACT_APP_SERVER_DOMAIN}/messages`,
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

            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, { ...newMessage, self: true }];
                return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });

            setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

            setInput('');

            //Update messageList to show latest messages.
            setFriends((prevFriends) =>
                prevFriends.map((friend) =>
                    friend.id === selectedFriend.id
                        ? {
                            ...friend,
                            lastMessage: newMessage.text,
                            lastMessageTime: newMessage.timestamp,
                        }
                        : friend
                )
            );
        }
    };

    const handleImageUpload = (imageUrl) => {
        if (imageUrl && selectedFriend) {
            const newMessage = {
                senderId: userId,
                receiverId: selectedFriend.id,
                text: input.trim() || null, // Include text if there is any
                imageUrl: imageUrl,
                timestamp: new Date().toISOString(),
                avatar: nickname,
            };

            console.log('Sending image message:', newMessage);

            socket.emit('send_message', newMessage);

            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, { ...newMessage, self: true }];
                return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });

            setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

            setInput(''); // Clear text input after sending

            //Update messageList to show latest messages with image indicator
            setFriends((prevFriends) =>
                prevFriends.map((friend) =>
                    friend.id === selectedFriend.id
                        ? {
                            ...friend,
                            lastMessage: newMessage.text || '[Image]',
                            lastMessageTime: newMessage.timestamp,
                            imageUrl: imageUrl,
                        }
                        : friend
                )
            );
        }
    };

    const handleToggleEmojiPanel = () => {
        setShowEmojiPanel(prev => !prev);
    };

    const handleSelectEmoji = (imageUrl) => {
        // Send the emoji as an image message
        handleImageUpload(imageUrl);
    };

    const handleDeleteDMs = async () => {
        if (selectedFriend) {
            try {
                await axios.post(
                    `${process.env.REACT_APP_SERVER_DOMAIN}/dm/delete`,
                    { friendId: selectedFriend.id },
                    { headers: { Authorization: `Bearer ${token}` } }
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
        const newSocket = io(`${process.env.REACT_APP_SERVER_DOMAIN}`);
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
        setNickname('')
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

        if (section !== 'friend-list') {
            setSelectedFriend(null);
        }
    };

    return (
        <div style={styles.container}>
            <ToastContainer ref={toastRef} />
            {showNotificationModal && (
                <div className="modal" style={{ display: 'block', backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Enable Notifications</h5>
                                <button type="button" className="btn-close" onClick={handleDismissNotification}></button>
                            </div>
                            <div className="modal-body">
                                <p>We recommend enabling notifications to stay updated with new messages and friend requests.</p>
                                <p>If you dismiss this message, you can still enable it in Momotalk settings page!</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={handleRequestNotificationPermission}>
                                    Enable Notifications
                                </button>
                                <button className="btn btn-secondary" onClick={handleDismissNotification}>
                                    No, Thanks
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
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
                    {/* Mobile Layout */}
                    {isMobile ? (
                        <div className="mobile-app-container">
                            {/* Mobile Menu Button */}
                            <button 
                                className={`mobile-menu-btn ${sidebarOpen ? 'active' : ''}`}
                                onClick={toggleSidebar}
                            >
                                <i className="bi bi-list" style={{ fontSize: '1.2rem' }}></i>
                            </button>

                            {/* Sidebar Overlay */}
                            {sidebarOpen && (
                                <div 
                                    className="sidebar-overlay"
                                    onClick={closeSidebar}
                                    style={{
                                        position: 'fixed',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0,0,0,0.5)',
                                        zIndex: 1040
                                    }}
                                />
                            )}

                            {/* Mobile Sidebar */}
                            <div 
                                className={`mobile-sidebar ${sidebarOpen ? 'show' : ''}`}
                                style={{
                                    position: 'fixed',
                                    top: 0,
                                    left: sidebarOpen ? '0' : '-280px',
                                    width: '280px',
                                    height: '100vh',
                                    backgroundColor: '#495A6E',
                                    zIndex: 1050,
                                    transition: 'left 0.3s ease',
                                    overflowY: 'auto'
                                }}
                            >
                                <Sidebar
                                    activeSection={activeSection}
                                    onSectionChange={handleSectionChange}
                                    onLogout={handleLogout}
                                    nickname={nickname}
                                    username={username}
                                    avatar={avatar}
                                    isMobile={true}
                                    onClose={closeSidebar}
                                />
                            </div>

                            {/* Main Content */}
                            <div className="mobile-main-content" style={{ height: '100vh', overflow: 'hidden' }}>
                                {activeSection === 'chat' && (
                                    <div className="mobile-chat-list" style={{ height: '100%', overflow: 'auto' }}>
                                        <MessageList
                                            messages={friends.map(friend => ({
                                                id: friend.id,
                                                username: friend.username,
                                                nickname: friend.nickname,
                                                text: friend.lastMessage || null,
                                                imageUrl: friend.imageUrl || null,
                                                timestamp: friend.lastMessageTime || friend.addedAt || null,
                                                avatar: friend.avatar,
                                                isOnline: friend.isOnline,
                                            }))}
                                            onSelectMessage={handleSelectFriendMobile}
                                            unreadMessagesCount={unreadMessagesCount}
                                            isMobile={true}
                                        />
                                    </div>
                                )}

                                {activeSection === 'friend-list' && !selectedFriend && (
                                    <div className="mobile-friend-list" style={{ height: '100%', overflow: 'auto' }}>
                                        <FriendList
                                            friends={friends}
                                            onSelectFriend={(friend) => {
                                                setSelectedFriend(friend);
                                            }}
                                            isMobile={true}
                                        />
                                    </div>
                                )}

                                {activeSection === 'friend-list' && selectedFriend && (
                                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, background: 'white', overflowY: 'auto' }}>
                                        <UserProfile
                                            user={selectedFriend}
                                            isOwnProfile={false}
                                            onSendMessage={() => {
                                                setActiveSection('chat');
                                            }}
                                            onRemoveFriend={handleRemoveFriend}
                                            onClose={() => setSelectedFriend(null)}
                                            isMobile={true}
                                        />
                                    </div>
                                )}

                                {activeSection === 'add-friend' && (
                                    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
                                        <FriendRequests
                                            friendRequests={friendRequests}
                                            onRespond={respondToFriendRequest}
                                            isMobile={true}
                                        />
                                        <SearchAndAddFriend
                                            onAddFriend={handleAddFriend}
                                            isMobile={true}
                                        />
                                    </div>
                                )}

                                {activeSection === 'settings' && (
                                    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
                                        <SettingsPage
                                            nickname={nickname}
                                            avatar={avatar}
                                            isDarkMode={isDarkMode}
                                            isAutoMode={isAutoMode}
                                            onUpdatePassword={handleUpdatePassword}
                                            onToggleDarkMode={toggleDarkMode}
                                            onToggleAutoMode={toggleAutoMode}
                                            onUpdateProfile={async ({ nickname, avatar: newAvatar }) => {
                                                try {
                                                    const response = await axios.post(
                                                        `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                        { nickname, avatar: newAvatar },
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    alert(response.data.message);
                                                    setNickname(nickname);
                                                    setAvatar(newAvatar || DEFAULT_AVATAR);
                                                    localStorage.setItem('nickname', nickname);
                                                    localStorage.setItem('avatar', newAvatar || DEFAULT_AVATAR);
                                                } catch (error) {
                                                    console.error('Error updating profile:', error.response?.data || error.message);
                                                    alert('Failed to update profile.');
                                                }
                                            }}
                                            isMobile={true}
                                        />
                                    </div>
                                )}

                                {activeSection === 'profile' && (
                                    <div style={{ height: '100%', overflow: 'auto' }}>
                                        <UserProfile
                                            user={{ username, nickname, avatar }}
                                            isOwnProfile={true}
                                            onClose={() => setActiveSection('chat')}
                                            onUpdateProfile={async ({ nickname, avatar: newAvatar }) => {
                                                try {
                                                    const response = await axios.post(
                                                        `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                        { nickname, avatar: newAvatar },
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    alert(response.data.message);
                                                    setNickname(nickname);
                                                    setAvatar(newAvatar || DEFAULT_AVATAR);
                                                    localStorage.setItem('nickname', nickname);
                                                    localStorage.setItem('avatar', newAvatar || DEFAULT_AVATAR);
                                                } catch (error) {
                                                    console.error('Error updating profile:', error.response?.data || error.message);
                                                    alert('Failed to update profile.');
                                                }
                                            }}
                                            isMobile={true}
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Chat Container for Mobile */}
                            {activeSection === 'chat' && selectedFriend && (
                                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1100, background: 'white' }}>
                                    <ChatContainer
                                        friend={selectedFriend}
                                        messages={dms}
                                        onDeleteDMs={handleDeleteDMs}
                                        userId={userId}
                                        socket={socketInstance}
                                        onBack={() => setSelectedFriend(null)}
                                        isMobile={true}
                                        input={input}
                                        onInputChange={(e) => setInput(e.target.value)}
                                        onSendMessage={handleSendDM}
                                        onImageUpload={handleImageUpload}
                                        onToggleEmojiPanel={handleToggleEmojiPanel}
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Desktop Layout */
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
                                    <MessageList
                                        messages={friends.map(friend => ({
                                            id: friend.id,
                                            username: friend.username,
                                            nickname: friend.nickname,
                                            text: friend.lastMessage || null,
                                            imageUrl: friend.imageUrl || null,
                                            timestamp: friend.lastMessageTime || friend.addedAt || null,
                                            avatar: friend.avatar,
                                            isOnline: friend.isOnline,
                                        }))}
                                        onSelectMessage={handleSelectFriend}
                                        unreadMessagesCount={unreadMessagesCount}
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
                                            onRespond={respondToFriendRequest}
                                        />
                                        <SearchAndAddFriend
                                            token={token}
                                            loggedInUsername={username}
                                            friendsList={friends}
                                            onAddFriend={handleAddFriend}
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
                                    position: 'relative'
                                }}
                            >
                                {activeSection === 'chat' && selectedFriend && (
                                    <>
                                        <ChatContainer
                                            messages={selectedFriend ? dms : []}
                                            currentChat={selectedFriend ? selectedFriend.nickname : 'Select a conversation'}
                                            friend={selectedFriend}
                                            isMobile={false}
                                            onImageUpload={handleImageUpload}
                                        />
                                        <MessageInput
                                            input={input}
                                            onInputChange={(e) => setInput(e.target.value)}
                                            onSendMessage={selectedFriend ? handleSendDM : null}
                                            onImageUpload={handleImageUpload}
                                            onToggleEmojiPanel={handleToggleEmojiPanel}
                                            isMobile={false}
                                        />
                                        {/* Emoji Panel for Desktop */}
                                        {!isMobile && (
                                            <EmojiPanel
                                                show={showEmojiPanel}
                                                onClose={() => setShowEmojiPanel(false)}
                                                onSelectEmoji={handleSelectEmoji}
                                                isMobile={false}
                                            />
                                        )}
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
                                        user={{ username, nickname, avatar }}
                                        isOwnProfile={true}
                                        onUpdateProfile={async ({ nickname, avatar: newAvatar }) => {
                                            const updatedAvatar = newAvatar || avatar;
                                            try {
                                                const response = await axios.post(
                                                    `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                    { nickname, avatar: updatedAvatar },
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                alert(response.data.message);
                                                setNickname(nickname);
                                                setAvatar(updatedAvatar || DEFAULT_AVATAR);
                                                localStorage.setItem('nickname', nickname);
                                                localStorage.setItem('avatar', updatedAvatar || DEFAULT_AVATAR);
                                            } catch (error) {
                                                console.error('Error updating profile:', error.response?.data || error.message);
                                                alert('Failed to update profile.');
                                            }
                                        }}
                                        onClose={() => setActiveSection('chat')}
                                    />
                                )}
                                {activeSection === 'settings' && (
                                    <SettingsPage
                                        onUpdatePassword={handleUpdatePassword}
                                        isDarkMode={isDarkMode}
                                        isAutoMode={isAutoMode}
                                        onToggleDarkMode={toggleDarkMode}
                                        onToggleAutoMode={toggleAutoMode}
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* Emoji Panel for Mobile */}
                    {isMobile && (
                        <EmojiPanel
                            show={showEmojiPanel}
                            onClose={() => setShowEmojiPanel(false)}
                            onSelectEmoji={handleSelectEmoji}
                            isMobile={true}
                        />
                    )}
                </>
            )}
        </div>
    );
}

export default App;