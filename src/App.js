import React, { useState, useEffect, useRef, useCallback } from 'react';
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

const socket = io(process.env.REACT_APP_SERVER_DOMAIN, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ['websocket', 'polling']
});

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
    const [signature, setSignature] = useState('');
    const [birthday, setBirthday] = useState('');
    const [captcha, setCaptcha] = useState('');
    const [captchaInput, setCaptchaInput] = useState('');
    const [friends, setFriends] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [dms, setDms] = useState([]);
    const [showMenu, setShowMenu] = useState(false);
    const [error, setError] = useState('');
    const [activeSection, setActiveSection] = useState('chat');
    const [selectedChat, setSelectedChat] = useState(null);
    const [userId, setUserId] = useState(null);
    const [avatar, setAvatar] = useState('');
    const [momoCode, setMomoCode] = useState('');
    const toastRef = useRef();
    const isRefreshingRef = useRef(false);
    const refreshQueueRef = useRef([]);
    const refreshClientRef = useRef(axios.create());
    const [socketInstance, setSocket] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(
        JSON.parse(localStorage.getItem('unreadMessagesCount')) || {}
    );
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showEmojiPanel, setShowEmojiPanel] = useState(false);
    const [imageQueue, setImageQueue] = useState([]); // [{ id, preview, imageUrl, uploading }]
    
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
        const savedSignature = localStorage.getItem('signature');
        const savedUserId = localStorage.getItem('userId');
        const savedAvatar = localStorage.getItem('avatar');
        const savedMomoCode = localStorage.getItem('momoCode');
        const savedBirthday = localStorage.getItem('birthday');
        // console.log('Loaded userId from localStorage:', savedUserId);
        // FOR DEBUG!
        if (savedToken) {
            setToken(savedToken);
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
        }

        if (savedUsername) setUsername(savedUsername);
        if (savedNickname) setNickname(savedNickname);
        if (savedSignature) setSignature(savedSignature);
        if (savedUserId) setUserId(parseInt(savedUserId, 10));
        if (savedAvatar) setAvatar(savedAvatar);
        else setAvatar(DEFAULT_AVATAR);
        if (savedMomoCode) setMomoCode(savedMomoCode);
        if (savedBirthday) setBirthday(savedBirthday);
    }, []);

    // Join room only once when userId is available
    useEffect(() => {
        if (!userId) return;

        const handleConnect = () => {
            console.log('Socket connected, joining room for userId:', userId);
            socket.emit('join_room', userId);
        };

        const handleDisconnect = () => {
            console.log('Socket disconnected');
        };

        // If already connected, join room immediately
        if (socket.connected) {
            socket.emit('join_room', userId);
            console.log(`Socket already connected, joined room for userId: ${userId}`);
        } else {
            // Wait for connection, then join room
            socket.once('connect', handleConnect);
        }

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);

        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
        };
    }, [userId]);

    useEffect(() => {
        const refreshClient = refreshClientRef.current;

        const processQueue = (error, newAccessToken) => {
            refreshQueueRef.current.forEach(({ resolve, reject }) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(newAccessToken);
                }
            });
            refreshQueueRef.current = [];
        };

        const interceptor = axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                const originalRequest = error.config;
                const status = error.response?.status;

                if (!originalRequest || status !== 401) {
                    return Promise.reject(error);
                }

                const requestUrl = originalRequest.url || '';
                const shouldBypassRefresh =
                    originalRequest._retry ||
                    requestUrl.includes('/login') ||
                    requestUrl.includes('/token/refresh') ||
                    requestUrl.includes('/logout');

                if (shouldBypassRefresh) {
                    handleLogout();
                    return Promise.reject(error);
                }

                const storedRefreshToken = localStorage.getItem('refreshToken');
                if (!storedRefreshToken) {
                    handleLogout();
                    return Promise.reject(error);
                }

                originalRequest._retry = true;

                if (isRefreshingRef.current) {
                    return new Promise((resolve, reject) => {
                        refreshQueueRef.current.push({ resolve, reject });
                    })
                        .then((newAccessToken) => {
                            if (newAccessToken) {
                                originalRequest.headers = originalRequest.headers || {};
                                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                            }
                            return axios(originalRequest);
                        })
                        .catch((queueError) => Promise.reject(queueError));
                }

                isRefreshingRef.current = true;

                try {
                    const refreshResponse = await refreshClient.post(
                        `${process.env.REACT_APP_SERVER_DOMAIN}/token/refresh`,
                        { refreshToken: storedRefreshToken }
                    );
                    const { token: newAccessToken, refreshToken: newRefreshToken } = refreshResponse.data || {};

                    if (!newAccessToken) {
                        throw new Error('Missing access token in refresh response');
                    }

                    setToken(newAccessToken);
                    localStorage.setItem('token', newAccessToken);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;

                    if (newRefreshToken) {
                        localStorage.setItem('refreshToken', newRefreshToken);
                    }

                    processQueue(null, newAccessToken);

                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                    return axios(originalRequest);
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    handleLogout();
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshingRef.current = false;
                }
            }
        );

        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const fetchFriends = useCallback(async () => {
        if (!token) return;
        try {
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/friends`);
            // Remove duplicates by id to prevent React key warnings
            const uniqueFriends = response.data.filter((friend, index, self) =>
                index === self.findIndex(f => f.id === friend.id)
            );
            // Sort friends by lastMessageTime (most recent first), then by addedAt for friends without messages
            const sortedFriends = uniqueFriends.sort((a, b) => {
                const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                return timeB - timeA; // Descending order (newest first)
            });
            setFriends(sortedFriends);
            
            // Request fresh online status after fetching friends
            if (uniqueFriends.length > 0) {
                const friendIds = uniqueFriends.map(f => f.id);
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
    }, [token]);

    const fetchFriendRequests = useCallback(async () => {
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
    }, [token]);

    // Fetch friends and requests when token is available
    useEffect(() => {
        if (token) {
            fetchFriends();
            fetchFriendRequests();
        }
    }, [token, fetchFriends, fetchFriendRequests]);

    // Handle incoming messages - NO join_room here!
    useEffect(() => {
        if (!userId) return;

        const handleReceiveMessage = (message) => {
            // Use current activeSection and selectedFriend from closure
            const currentActiveSection = activeSection;
            const currentSelectedFriend = selectedFriend;
            console.log('Received message:', message);

            // Skip if this is a message we just sent
            // Server should only send receive_message to receiver, but add check for safety
            if (message.senderId === userId) {
                console.log('Skipping own message from socket (already added optimistically)');
                return;
            }

            //Check Local Storge notification settings
            const isInternalNotificationEnabled = JSON.parse(localStorage.getItem("internalNotificationEnabled")) || false;

            if ('Notification' in window && Notification.permission === 'granted' && isInternalNotificationEnabled) {
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
                // Check if we're in chat section AND viewing this specific friend's chat
                const isViewingThisFriend = currentActiveSection === 'chat' && currentSelectedFriend && currentSelectedFriend.id === friendId;
                
                if (!isViewingThisFriend) {
                    setUnreadMessagesCount((prev) => {
                        const updated = {
                            ...prev,
                            [friendId]: (prev[friendId] || 0) + 1,
                        };
                        localStorage.setItem('unreadMessagesCount', JSON.stringify(updated));
                        return updated;
                    });
                } else {
                    // Check for duplicates before adding
                    setDms((prevDms) => {
                        // Check if message already exists (by timestamp + imageUrl/text + senderId)
                        const messageKey = `${message.timestamp}_${message.imageUrl || ''}_${message.text || ''}_${message.senderId}`;
                        const exists = prevDms.some(dm => {
                            const dmKey = `${dm.timestamp}_${dm.imageUrl || ''}_${dm.text || ''}_${dm.senderId}`;
                            return dmKey === messageKey;
                        });
                        if (exists) {
                            console.log('Duplicate message detected, skipping');
                            return prevDms;
                        }
                        return [...prevDms, updatedMessage];
                    });
                }

                setMessages((prevMessages) => {
                    // Check for duplicates before adding
                    const messageKey = `${message.timestamp}_${message.imageUrl || ''}_${message.text || ''}_${message.senderId}`;
                    const exists = prevMessages.some(msg => {
                        const msgKey = `${msg.timestamp}_${msg.imageUrl || ''}_${msg.text || ''}_${msg.senderId}`;
                        return msgKey === messageKey;
                    });
                    if (exists) {
                        console.log('Duplicate message detected in messages, skipping');
                        return prevMessages;
                    }
                    const updatedMessages = [...prevMessages, message];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });

                // Update friend and move to top of list (sorted by lastMessageTime)
                const updatedFriends = prevFriends.map((friend) =>
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

                // Sort friends by lastMessageTime (most recent first), then by addedAt for friends without messages
                return updatedFriends.sort((a, b) => {
                    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                    return timeB - timeA; // Descending order (newest first)
                });
            });
        };

        socket.on('receive_message', handleReceiveMessage);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
        };
    }, [userId, activeSection, selectedFriend]);

    useEffect(() => {
        // Use socket (global) since user joins room via socket
        socket.on('receive_friend_request', ({ senderId, senderUsername }) => {
            handleShowToast("New Friend!?", `${senderUsername} sent you a friend request!`);
            fetchFriendRequests();
            fetchFriends();
        });

        socket.on('friend_request_responded', ({ receiverId, action }) => {
            if (action === 'accept') {
                handleShowToast("Yay!", "Your friend request was accepted!");
                fetchFriends();
            } else if (action === 'reject') {
                handleShowToast(":(", "Your friend request was rejected!");
            }
        });

        socket.on('update_friend_list', () => {
            console.log('Received update_friend_list event');
            fetchFriends();
            fetchFriendRequests();
        });

        return () => {
            socket.off('receive_friend_request');
            socket.off('friend_request_responded');
            socket.off('update_friend_list');
        };
    }, [fetchFriendRequests, fetchFriends]);

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
        // Another Fix apple 
        if (!('Notification' in window)) {
            return;
        }
        
        const notificationDismissed = localStorage.getItem('notificationDismissed');
        if (Notification.permission === 'default' && !notificationDismissed) {
            setShowNotificationModal(true);
        }
    }, []);

    const handleRequestNotificationPermission = () => {
        if (!('Notification' in window)) {
            alert('Notifications are not supported on this device/browser.');
            setShowNotificationModal(false);
            return;
        }
        
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

    const handleDeleteAccount = () => {
        // Clear all local storage
        localStorage.clear();
        
        // Disconnect socket if exists
        if (socketInstance) {
            socketInstance.emit('leave_room', userId);
            socketInstance.removeAllListeners();
            socketInstance.disconnect();
        }
        if (socket && socket.connected) {
            socket.emit('leave_room', userId);
            socket.disconnect();
        }
        
        // Reset all state
        setToken(null);
        setUsername('');
        setPassword('');
        setNickname('');
        setSignature('');
        setBirthday('');
        setUserId(null);
        setAvatar('');
        setMomoCode('');
        setFriends([]);
        setFriendRequests([]);
        setSelectedFriend(null);
        setDms([]);
        setMessages([]);
        setUnreadMessagesCount({});
        
        // Clear axios default headers
        delete axios.defaults.headers.common['Authorization'];
        
        // Redirect to login
        setActiveSection('login');
        setError('');
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

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/login`, { username, password });
            const { token, refreshToken, username: loggedInUsername, nickname: loggedInNickname, signature: userSignature, userId: loggedInUserId, avatar, momoCode: userMomoCode, birthday: userBirthday } = response.data;

            setToken(token);
            setUsername(loggedInUsername);
            setNickname(loggedInNickname);
            setSignature(userSignature || '');
            setUserId(loggedInUserId);
            setAvatar(avatar || DEFAULT_AVATAR);
            setMomoCode(userMomoCode || '');
            setBirthday(userBirthday || '');

            localStorage.setItem('token', token);
            if (refreshToken) {
                localStorage.setItem('refreshToken', refreshToken);
            }
            localStorage.setItem('username', loggedInUsername);
            localStorage.setItem('nickname', loggedInNickname);
            localStorage.setItem('signature', userSignature || '');
            localStorage.setItem('userId', loggedInUserId);
            localStorage.setItem('avatar', avatar || DEFAULT_AVATAR);
            localStorage.setItem('momoCode', userMomoCode || '');
            localStorage.setItem('birthday', userBirthday || '');

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

    const handleAddFriend = async (momoCode) => {
        try {
            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/add`, { friendMomoCode: momoCode }, {
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
            handleShowToast("Error", error.response?.data?.error || "Failed to add friend");
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


    const respondToFriendRequest = async (requestId, action) => {
        try {
            await axios.post(
                `${process.env.REACT_APP_SERVER_DOMAIN}/friend/respond`,
                { requestId, action },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            handleShowToast(
                action === 'accept' ? 'Success' : 'Notification',
                action === 'accept' ? 'Friend request accepted!' : 'Friend request rejected.'
            );

            // Backend already sends socket events, so we don't need to emit here
            // Just update local state
            fetchFriendRequests();
            if (action === 'accept') {
                fetchFriends();
            }
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

    // Remove image from queue
    const removeImageFromQueue = (imageId) => {
        setImageQueue(prev => prev.filter(item => item.id !== imageId));
    };

    // Add image to queue (for drag & drop and file select)
    const addImageToQueue = async (file) => {
        if (!file) return;

        // Check file type
        if (!file.type.startsWith('image/')) {
            alert('Please select an image file');
            return;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert('Image size must be less than 5MB');
            return;
        }

        // Create preview
        const reader = new FileReader();
        const imageId = Date.now() + Math.random(); // Add random to ensure unique IDs when adding multiple files
        reader.onloadend = () => {
            // Add to queue with uploading state, check limit here (max 10 images)
            const maxImages = 10;
            setImageQueue(prev => {
                if (prev.length >= maxImages) {
                    alert(`You can only select up to ${maxImages} images at a time. Please remove some images first.`);
                    return prev;
                }
                return [...prev, {
                    id: imageId,
                    preview: reader.result,
                    imageUrl: null,
                    uploading: true
                }];
            });
        };
        reader.readAsDataURL(file);

        // Upload image
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('image', file);

            const response = await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/upload/chat-image`, formData, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            if (response.data.imageUrl) {
                // Update queue item with uploaded URL
                setImageQueue(prev => prev.map(item => 
                    item.id === imageId 
                        ? { ...item, imageUrl: response.data.imageUrl, uploading: false }
                        : item
                ));
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert(error.response?.data?.error || 'Failed to upload image');
            // Remove failed item from queue
            setImageQueue(prev => prev.filter(item => item.id !== imageId));
        }
    };

    const handleSendDM = (e, imageUrls = []) => {
        e.preventDefault();
        const hasText = input.trim();
        const hasImages = imageUrls && imageUrls.length > 0;
        
        // Ensure socket is connected before sending
        if (!socket.connected) {
            console.warn('Socket not connected, attempting to reconnect...');
            socket.connect();
            // Wait a bit for connection, then retry
            setTimeout(() => {
                if (socket.connected && userId) {
                    socket.emit('join_room', userId);
                }
            }, 1000);
        }
        
        if ((hasText || hasImages) && selectedFriend) {
            // If multiple images, send them separately; if single image or text+image, send together
            if (hasImages && hasImages.length === 1 && hasText) {
                // Single image with text - send together
                const newMessage = {
                    senderId: userId,
                    receiverId: selectedFriend.id,
                    text: input.trim(),
                    imageUrl: imageUrls[0],
                    timestamp: new Date().toISOString(),
                    avatar: nickname,
                };

                console.log('Sending message with image:', newMessage);

                socket.emit('send_message', newMessage);

                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, { ...newMessage, self: true }];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });

                setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

                setInput('');
                setImageQueue([]); // Clear queue after sending

                //Update messageList and sort by lastMessageTime
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) =>
                        friend.id === selectedFriend.id
                            ? {
                                ...friend,
                                lastMessage: newMessage.text || '[Image]',
                                lastMessageTime: newMessage.timestamp,
                            }
                            : friend
                    );
                    // Sort by lastMessageTime (most recent first)
                    return updated.sort((a, b) => {
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                        return timeB - timeA;
                    });
                });
            } else {
                // Multiple images or images only - send text first (if any), then images
                if (hasText) {
                    const textMessage = {
                        senderId: userId,
                        receiverId: selectedFriend.id,
                        text: input.trim(),
                        timestamp: new Date().toISOString(),
                        avatar: nickname,
                    };

                    socket.emit('send_message', textMessage);

                    setMessages((prevMessages) => {
                        const updatedMessages = [...prevMessages, { ...textMessage, self: true }];
                        return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    });

                    setDms((prevDms) => [...prevDms, { ...textMessage, self: true, avatar: nickname }]);
                }

                // Send each image as separate message
                imageUrls.forEach((imageUrl, index) => {
                    const imageMessage = {
                        senderId: userId,
                        receiverId: selectedFriend.id,
                        text: null,
                        imageUrl: imageUrl,
                        timestamp: new Date(Date.now() + index).toISOString(), // Slight delay to maintain order
                        avatar: nickname,
                    };

                    socket.emit('send_message', imageMessage);

                    setMessages((prevMessages) => {
                        const updatedMessages = [...prevMessages, { ...imageMessage, self: true }];
                        return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    });

                    setDms((prevDms) => [...prevDms, { ...imageMessage, self: true, avatar: nickname }]);
                });

                setInput('');
                setImageQueue([]); // Clear queue after sending

                //Update messageList and sort by lastMessageTime
                const lastMessage = hasText ? input.trim() : '[Image]';
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) =>
                        friend.id === selectedFriend.id
                            ? {
                                ...friend,
                                lastMessage: lastMessage,
                                lastMessageTime: new Date().toISOString(),
                            }
                            : friend
                    );
                    // Sort by lastMessageTime (most recent first)
                    return updated.sort((a, b) => {
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                        return timeB - timeA;
                    });
                });
            }
        }
    };

    // Used for emoji panel - sends immediately (not queued)
    const handleImageUpload = (imageUrl) => {
        // Ensure socket is connected before sending
        if (!socket.connected) {
            console.warn('Socket not connected, attempting to reconnect...');
            socket.connect();
            if (userId) {
                setTimeout(() => socket.emit('join_room', userId), 1000);
            }
        }
        
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

            //Update messageList to show latest messages with image indicator and sort
            setFriends((prevFriends) => {
                const updated = prevFriends.map((friend) =>
                    friend.id === selectedFriend.id
                        ? {
                            ...friend,
                            lastMessage: newMessage.text || '[Image]',
                            lastMessageTime: newMessage.timestamp,
                            imageUrl: imageUrl,
                        }
                        : friend
                );
                // Sort by lastMessageTime (most recent first)
                return updated.sort((a, b) => {
                    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                    return timeB - timeA;
                });
            });
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
        const storedRefreshToken = localStorage.getItem('refreshToken');
        if (storedRefreshToken) {
            refreshClientRef.current
                .post(`${process.env.REACT_APP_SERVER_DOMAIN}/logout`, { refreshToken: storedRefreshToken })
                .catch((error) => {
                    console.error('Failed to revoke session on logout:', error?.response?.data?.error || error.message);
                });
        }

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
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('username');
        localStorage.removeItem('nickname');
        localStorage.removeItem('signature');
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

    // Update header badge based on current section
    const updateHeaderBadge = (section) => {
        const badge = document.getElementById('current-tab-badge');
        if (!badge) return;

        const sectionNames = {
            'chat': 'Chat',
            'friend-list': 'Friend List',
            'add-friend': 'Add Friend',
            'profile': 'Profile',
            'settings': 'Settings'
        };

        const displayName = sectionNames[section];
        if (displayName) {
            badge.textContent = displayName;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    };

    // Update badge when section changes
    useEffect(() => {
        if (token) {
            updateHeaderBadge(activeSection);
        } else {
            // Hide badge when not logged in
            const badge = document.getElementById('current-tab-badge');
            if (badge) {
                badge.style.display = 'none';
            }
        }
    }, [activeSection, token]);

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
                                    unreadMessagesCount={unreadMessagesCount}
                                    friendRequests={friendRequests}
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
                                            token={token}
                                            loggedInUsername={username}
                                            loggedInMomoCode={momoCode}
                                            friendsList={friends}
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
                                            signature={signature}
                                            isDarkMode={isDarkMode}
                                            isAutoMode={isAutoMode}
                                            onUpdatePassword={handleUpdatePassword}
                                            onToggleDarkMode={toggleDarkMode}
                                            onToggleAutoMode={toggleAutoMode}
                                            onDeleteAccount={handleDeleteAccount}
                                            onUpdateProfile={async ({ nickname, avatar: newAvatar, signature: newSignature, birthday: newBirthday }) => {
                                                try {
                                                    const response = await axios.post(
                                                        `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                        { nickname, avatar: newAvatar, signature: newSignature, birthday: newBirthday },
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    alert(response.data.message);
                                                    setNickname(nickname);
                                                    setAvatar(newAvatar || DEFAULT_AVATAR);
                                                    setSignature(newSignature || '');
                                                    setBirthday(newBirthday || '');
                                                    localStorage.setItem('nickname', nickname);
                                                    localStorage.setItem('avatar', newAvatar || DEFAULT_AVATAR);
                                                    localStorage.setItem('signature', newSignature || '');
                                                    localStorage.setItem('birthday', newBirthday || '');
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
                                            user={{ username, nickname, avatar, momoCode, signature, birthday }}
                                            isOwnProfile={true}
                                            onClose={() => setActiveSection('chat')}
                                            onUpdateProfile={async ({ nickname, avatar: newAvatar, signature: newSignature, birthday: newBirthday }) => {
                                                try {
                                                    const response = await axios.post(
                                                        `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                        { nickname, avatar: newAvatar, signature: newSignature, birthday: newBirthday },
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    alert(response.data.message);
                                                    setNickname(nickname);
                                                    setAvatar(newAvatar || DEFAULT_AVATAR);
                                                    setSignature(newSignature || '');
                                                    setBirthday(newBirthday || '');
                                                    localStorage.setItem('nickname', nickname);
                                                    localStorage.setItem('avatar', newAvatar || DEFAULT_AVATAR);
                                                    localStorage.setItem('signature', newSignature || '');
                                                    localStorage.setItem('birthday', newBirthday || '');
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
                                        onToggleEmojiPanel={handleToggleEmojiPanel}
                                        imageQueue={imageQueue}
                                        onAddImageToQueue={addImageToQueue}
                                        onRemoveImageFromQueue={removeImageFromQueue}
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
                                unreadMessagesCount={unreadMessagesCount}
                                friendRequests={friendRequests}
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
                                            loggedInMomoCode={momoCode}
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
                                            imageQueue={imageQueue}
                                            onAddImageToQueue={addImageToQueue}
                                            onRemoveImageFromQueue={removeImageFromQueue}
                                        />
                                        <MessageInput
                                            input={input}
                                            onInputChange={(e) => setInput(e.target.value)}
                                            onSendMessage={selectedFriend ? handleSendDM : null}
                                            onToggleEmojiPanel={handleToggleEmojiPanel}
                                            isMobile={false}
                                            imageQueue={imageQueue}
                                            onAddImageToQueue={addImageToQueue}
                                            onRemoveImageFromQueue={removeImageFromQueue}
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
                                        user={{ username, nickname, avatar, momoCode, signature, birthday }}
                                        isOwnProfile={true}
                                        onUpdateProfile={async ({ nickname, avatar: newAvatar, signature: newSignature, birthday: newBirthday }) => {
                                            const updatedAvatar = newAvatar || avatar;
                                            try {
                                                const response = await axios.post(
                                                    `${process.env.REACT_APP_SERVER_DOMAIN}/user/update`,
                                                    { nickname, avatar: updatedAvatar, signature: newSignature, birthday: newBirthday },
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                alert(response.data.message);
                                                setNickname(nickname);
                                                setAvatar(updatedAvatar || DEFAULT_AVATAR);
                                                setSignature(newSignature || '');
                                                setBirthday(newBirthday || '');
                                                localStorage.setItem('nickname', nickname);
                                                localStorage.setItem('avatar', updatedAvatar || DEFAULT_AVATAR);
                                                localStorage.setItem('signature', newSignature || '');
                                                localStorage.setItem('birthday', newBirthday || '');
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
                                        onDeleteAccount={handleDeleteAccount}
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