import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
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
    const { t, i18n } = useTranslation();
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
    const processedMessagesRef = useRef(new Set()); // Track processed message IDs to prevent duplicate unread counts
    const [socketInstance, setSocket] = useState(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isAutoMode, setIsAutoMode] = useState(false);
    const [unreadMessagesCount, setUnreadMessagesCount] = useState(
        JSON.parse(localStorage.getItem('unreadMessagesCount')) || {}
    );
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [showEmojiPanel, setShowEmojiPanel] = useState(false);
    const [imageQueue, setImageQueue] = useState([]); // [{ id, preview, imageUrl, uploading }]
    const [showMultiDevice, setShowMultiDevice] = useState(() => {
        const stored = localStorage.getItem('showMultiDevice');
        return stored !== null ? JSON.parse(stored) : true; // Default to true
    });
    const [replyTo, setReplyTo] = useState(null);
    // Track last message for "Other Device" (self-messages)
    const [selfLastMessage, setSelfLastMessage] = useState(null);
    const [selfLastMessageTime, setSelfLastMessageTime] = useState(null);
    const [selfLastImageUrl, setSelfLastImageUrl] = useState(null);
    
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
            // Sort friends: online first, then by lastMessageTime (most recent first)
            const sortedFriends = uniqueFriends.sort((a, b) => {
                if (a.isOnline !== b.isOnline) {
                    return b.isOnline ? 1 : -1; // Online users first
                }
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

            // Check if this is a self-message (sender === receiver, multi-device sync)
            const isSelfMessage = message.senderId === userId && message.receiverId === userId;
            
            // Note: We no longer skip messages sent by ourselves to others
            // This is because for multi-device sync, other devices of the sender
            // need to receive the message. The duplicate detection logic below
            // will handle preventing duplicate messages on the device that sent it.

            //Check Local Storge notification settings
            const isInternalNotificationEnabled = JSON.parse(localStorage.getItem("internalNotificationEnabled")) || false;

            if ('Notification' in window && Notification.permission === 'granted' && isInternalNotificationEnabled) {
                // Show appropriate notification text based on message type
                const notificationBody = message.text || (message.imageUrl ? '[Image]' : t('notification.newMessage'));
                const notification = new Notification(`${t('notification.newMessageFrom')} ${message.nickname || 'Unknown'}`, {
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

                // Handle self-messages (multi-device sync)
                const isSelfMessage = friendId === userId;
                const isViewingThisFriend = currentActiveSection === 'chat' && currentSelectedFriend && (
                    (isSelfMessage && currentSelectedFriend.isSelf) || 
                    (!isSelfMessage && currentSelectedFriend.id === friendId)
                );
                
                // Always update DMs if viewing this friend's chat, or if it's a self-message (for multi-device sync)
                // Also update for regular messages from friends (even if we sent it - for multi-device sync)
                const shouldUpdateDMs = isViewingThisFriend || isSelfMessage;
                
                // Generate a unique key for message to track if it's been processed
                const messageKey = message.id ? `id_${message.id}` : 
                                  message.clientId ? `client_${message.clientId}` :
                                  `key_${message.timestamp}_${message.imageUrl || ''}_${message.text || ''}_${message.senderId}`;
                
                // Check if message already exists in messages to prevent duplicate unread count
                let isNewMessage = true;
                setMessages((prevMessages) => {
                    // If message has id, check by id first (server message)
                    if (message.id) {
                        const existsById = prevMessages.some(msg => msg.id === message.id);
                        if (existsById) {
                            isNewMessage = false;
                            // Update existing message with server data
                            return prevMessages.map(msg => msg.id === message.id ? updatedMessage : msg)
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        }
                    }
                    // If message has clientId, check by clientId 
                    if (message.clientId) {
                        const existsByClientId = prevMessages.some(msg => msg.clientId === message.clientId);
                        if (existsByClientId) {
                            isNewMessage = false;
                            // Replace optimistic update with server message
                            return prevMessages.map(msg => msg.clientId === message.clientId ? updatedMessage : msg)
                                .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                        }
                    }
                    // Fallback
                    const msgKey = `${message.timestamp}_${message.imageUrl || ''}_${message.text || ''}_${message.senderId}`;
                    const exists = prevMessages.some(msg => {
                        if (msg.id || msg.clientId) return false;
                        const existingMsgKey = `${msg.timestamp}_${msg.imageUrl || ''}_${msg.text || ''}_${msg.senderId}`;
                        return existingMsgKey === msgKey;
                    });
                    if (exists) {
                        isNewMessage = false;
                        return prevMessages;
                    }
                    const updatedMessages = [...prevMessages, updatedMessage];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });
                
                if (shouldUpdateDMs) {
                    // Check for duplicates before adding
                    setDms((prevDms) => {
                        // If message has id, check by id first (server message)
                        if (message.id) {
                            const existsById = prevDms.some(dm => dm.id === message.id);
                            if (existsById) {
                                // Update existing message with server data
                                return prevDms.map(dm => dm.id === message.id ? updatedMessage : dm);
                            }
                        }
                        // If message has clientId, check by clientId
                        if (message.clientId) {
                            const existsByClientId = prevDms.some(dm => dm.clientId === message.clientId);
                            if (existsByClientId) {
                                // Replace optimistic update with server message
                                return prevDms.map(dm => dm.clientId === message.clientId ? updatedMessage : dm);
                            }
                        }
                        // Fallback
                        const dmKey = `${message.timestamp}_${message.imageUrl || ''}_${message.text || ''}_${message.senderId}`;
                        const exists = prevDms.some(dm => {
                            if (dm.id || dm.clientId) return false; // Already handled above
                            const existingDmKey = `${dm.timestamp}_${dm.imageUrl || ''}_${dm.text || ''}_${dm.senderId}`;
                            return existingDmKey === dmKey;
                        });
                        if (exists) {
                            return prevDms;
                        }
                        return [...prevDms, updatedMessage];
                    });
                } else {
                    // Not viewing this friend's chat - increment unread count only for new regular messages
                    if (!isSelfMessage && isNewMessage) {
                        // Check if we already processed this message
                        if (!processedMessagesRef.current.has(messageKey)) {
                            processedMessagesRef.current.add(messageKey);
                            // Clean up old entries
                            if (processedMessagesRef.current.size > 1000) {
                                const entries = Array.from(processedMessagesRef.current);
                                processedMessagesRef.current = new Set(entries.slice(-500));
                            }
                            
                            setUnreadMessagesCount((prev) => {
                                const updated = {
                                    ...prev,
                                    [friendId]: (prev[friendId] || 0) + 1,
                                };
                                localStorage.setItem('unreadMessagesCount', JSON.stringify(updated));
                                return updated;
                            });
                        }
                    }
                }

                // Update friend and move to top of list (sorted by lastMessageTime)
                // For self-messages, we also want to update if viewing "Other Device"
                const updatedFriends = prevFriends.map((friend) => {
                    // For self-messages, check if friend has isSelf flag or id matches userId
                    if (isSelfMessage && (friend.isSelf || friend.id === userId)) {
                        // Also update self message state for message list preview
                        setSelfLastMessage(message.text || (message.imageUrl ? '[Image]' : ''));
                        setSelfLastMessageTime(message.timestamp);
                        setSelfLastImageUrl(message.imageUrl || null);
                        
                        return {
                            ...friend,
                            lastMessage: message.text || (message.imageUrl ? '[Image]' : ''),
                            lastMessageTime: message.timestamp,
                            imageUrl: message.imageUrl,
                            avatar: avatar || DEFAULT_AVATAR,
                        };
                    }
                    // For regular messages
                    if (!isSelfMessage && friend.id === friendId) {
                        return {
                            ...friend,
                            lastMessage: message.text || (message.imageUrl ? '[Image]' : ''),
                            lastMessageTime: message.timestamp,
                            imageUrl: message.imageUrl,
                            avatar: senderFriend ? senderFriend.avatar : friend.avatar,
                        };
                    }
                    return friend;
                });
                
                // Also update self message state for self-messages (even if not in friends list)
                if (isSelfMessage) {
                    setSelfLastMessage(message.text || (message.imageUrl ? '[Image]' : ''));
                    setSelfLastMessageTime(message.timestamp);
                    setSelfLastImageUrl(message.imageUrl || null);
                }

                // Sort friends: online first, then by lastMessageTime (most recent first)
                return updatedFriends.sort((a, b) => {
                    if (a.isOnline !== b.isOnline) {
                        return b.isOnline ? 1 : -1; // Online users first
                    }
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
            handleShowToast(t('toast.notification'), t('toast.newFriendRequest', { username: senderUsername }));
            fetchFriendRequests();
            fetchFriends();
        });

        socket.on('friend_request_responded', ({ receiverId, action }) => {
            if (action === 'accept') {
                handleShowToast(t('toast.success'), t('toast.requestAccepted'));
                fetchFriends();
            } else if (action === 'reject') {
                handleShowToast(t('toast.notification'), t('toast.requestRejected'));
            }
        });

        socket.on('update_friend_list', () => {
            console.log('Received update_friend_list event');
            fetchFriends();
            fetchFriendRequests();
        });

        // Handle profile updates from other devices
        socket.on('profile_updated', (updatedProfile) => {
            console.log('Received profile_updated event:', updatedProfile);
            // Only update if this is the current user's profile
            if (updatedProfile.userId === userId) {
                // Update local state
                if (updatedProfile.nickname !== undefined) {
                    setNickname(updatedProfile.nickname);
                    localStorage.setItem('nickname', updatedProfile.nickname);
                }
                if (updatedProfile.signature !== undefined) {
                    setSignature(updatedProfile.signature || '');
                    localStorage.setItem('signature', updatedProfile.signature || '');
                }
                if (updatedProfile.avatar !== undefined) {
                    setAvatar(updatedProfile.avatar || DEFAULT_AVATAR);
                    localStorage.setItem('avatar', updatedProfile.avatar || DEFAULT_AVATAR);
                }
                if (updatedProfile.birthday !== undefined) {
                    setBirthday(updatedProfile.birthday || '');
                    localStorage.setItem('birthday', updatedProfile.birthday || '');
                }
                
                // Refresh friends list to update avatar/nickname in friend list
                fetchFriends();
            }
        });

        return () => {
            socket.off('receive_friend_request');
            socket.off('friend_request_responded');
            socket.off('update_friend_list');
            socket.off('profile_updated');
        };
    }, [fetchFriendRequests, fetchFriends, userId]);

    //User online status
    useEffect(() => {
        socket.on('friend_status_update', ({ friendId, isOnline, lastSeen }) => {
            setFriends((prevFriends) => {
                const updated = prevFriends.map((friend) =>
                    friend.id === friendId && friend.isOnline !== isOnline
                        ? { ...friend, isOnline, lastSeen: lastSeen || friend.lastSeen }
                        : friend
                );
                return updated.sort((a, b) => {
                    if (a.isOnline !== b.isOnline) {
                        return b.isOnline ? 1 : -1;
                    }
                    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                    return timeB - timeA;
                });
            });
            
            if (selectedFriend && selectedFriend.id === friendId) {
                setSelectedFriend(prev => ({ ...prev, isOnline, lastSeen: lastSeen || prev.lastSeen }));
            }
        });

        // Handle batch status updates
        socket.on('friends_status_response', (statusUpdates) => {
            setFriends((prevFriends) => {
                const updated = prevFriends.map((friend) => {
                    const update = statusUpdates.find(s => s.friendId === friend.id);
                    return update ? { ...friend, isOnline: update.isOnline, lastSeen: update.lastSeen || friend.lastSeen } : friend;
                });
                return updated.sort((a, b) => {
                    if (a.isOnline !== b.isOnline) {
                        return b.isOnline ? 1 : -1;
                    }
                    const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                    const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                    return timeB - timeA;
                });
            });
            
            setSelectedFriend(prev => {
                if (!prev) return prev;
                const update = statusUpdates.find(s => s.friendId === prev.id);
                return update ? { ...prev, isOnline: update.isOnline, lastSeen: update.lastSeen || prev.lastSeen } : prev;
            });
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
            alert(t('toast.registrationSuccess'));
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

            handleShowToast(t('toast.success'), t('toast.friendRequestSent'));
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
            handleShowToast(t('toast.error'), error.response?.data?.error || t('toast.respondError'));
        }
    };

    const handleAcceptFriend = async (friendId) => {
        try {
            await axios.post(`${process.env.REACT_APP_SERVER_DOMAIN}/friend/accept`, { friendId }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(t('toast.friendRequestAccepted'));
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
                action === 'accept' ? t('toast.success') : t('toast.notification'),
                action === 'accept' ? t('toast.friendRequestAccepted') : t('toast.friendRequestRejected')
            );

            // Backend already sends socket events, so we don't need to emit here
            // Just update local state
            fetchFriendRequests();
            if (action === 'accept') {
                fetchFriends();
            }
        } catch (error) {
            handleShowToast(t('toast.error'), t('toast.respondError'));
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

        if (friend.isSelf) {
            setSelectedFriend(friend);
            try {
                const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/dm/${userId}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const messagesWithAvatar = response.data.map((message) => ({
                    ...message,
                    self: true,
                    avatar: avatar || DEFAULT_AVATAR,
                }));
                setDms(messagesWithAvatar);
                
                // Update self message state with last message from history
                if (messagesWithAvatar.length > 0) {
                    const lastMessage = messagesWithAvatar[messagesWithAvatar.length - 1];
                    setSelfLastMessage(lastMessage.text || (lastMessage.imageUrl ? '[Image]' : ''));
                    setSelfLastMessageTime(lastMessage.timestamp);
                    setSelfLastImageUrl(lastMessage.imageUrl || null);
                }
            } catch (error) {
                if (error.response?.status === 401) {
                    console.error('Unauthorized! Clearing token.');
                    handleLogout();
                } else {
                    console.error('Error fetching self DMs:', error);
                }
            }
            return;
        }

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
            alert(t('toast.imageUploadError'));
            return;
        }

        // Check file size (5MB max)
        if (file.size > 5 * 1024 * 1024) {
            alert(t('toast.imageSizeError'));
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
                    alert(t('toast.maxImagesError', { max: maxImages }));
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
            alert(error.response?.data?.error || t('toast.uploadError'));
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
            const receiverId = selectedFriend.isSelf ? userId : selectedFriend.id;
            // If multiple images, send them separately; if single image or text+image, send together
            if (hasImages && hasImages.length === 1 && hasText) {
                // Single image with text - send together
                const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const newMessage = {
                    senderId: userId,
                    receiverId: receiverId,
                    text: input.trim(),
                    imageUrl: imageUrls[0],
                    timestamp: new Date().toISOString(),
                    avatar: nickname,
                    replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, imageUrl: replyTo.imageUrl, senderId: replyTo.senderId } : null,
                    clientId
                };

                console.log('Sending message with image:', newMessage);

                socket.emit('send_message', newMessage);

                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, { ...newMessage, self: true }];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });

                setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

                setInput('');
                setImageQueue([]);
                setReplyTo(null);

                //Update messageList and sort by lastMessageTime (including self-messages for "Other Device")
                // Update self message state if sending to self
                if (selectedFriend.isSelf) {
                    setSelfLastMessage(newMessage.text || '[Image]');
                    setSelfLastMessageTime(newMessage.timestamp);
                    setSelfLastImageUrl(newMessage.imageUrl || null);
                }
                
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) => {
                        // For self-messages, update if friend has isSelf flag or id matches userId
                        if (selectedFriend.isSelf && (friend.isSelf || friend.id === userId)) {
                            return {
                                ...friend,
                                lastMessage: newMessage.text || '[Image]',
                                lastMessageTime: newMessage.timestamp,
                                imageUrl: newMessage.imageUrl || null,
                            };
                        }
                        // For regular messages
                        if (!selectedFriend.isSelf && friend.id === selectedFriend.id) {
                            return {
                                ...friend,
                                lastMessage: newMessage.text || '[Image]',
                                lastMessageTime: newMessage.timestamp,
                                imageUrl: newMessage.imageUrl || null,
                            };
                        }
                        return friend;
                    });
                    // Sort: online first, then by lastMessageTime (most recent first)
                    return updated.sort((a, b) => {
                        if (a.isOnline !== b.isOnline) {
                            return b.isOnline ? 1 : -1; // Online users first
                        }
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                        return timeB - timeA;
                    });
                });
            } else if (hasText && !hasImages) {
                // Pure text message (no images)
                const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const textMessage = {
                    senderId: userId,
                    receiverId: receiverId,
                    text: input.trim(),
                    timestamp: new Date().toISOString(),
                    avatar: nickname,
                    replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, imageUrl: replyTo.imageUrl, senderId: replyTo.senderId } : null,
                    clientId
                };

                socket.emit('send_message', textMessage);

                setMessages((prevMessages) => {
                    const updatedMessages = [...prevMessages, { ...textMessage, self: true }];
                    return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                });

                setDms((prevDms) => [...prevDms, { ...textMessage, self: true, avatar: nickname }]);

                setInput('');
                setImageQueue([]);
                setReplyTo(null);

                // Update self message state if sending to self
                if (selectedFriend.isSelf) {
                    setSelfLastMessage(textMessage.text);
                    setSelfLastMessageTime(textMessage.timestamp);
                    setSelfLastImageUrl(null);
                }
                
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) => {
                        if (selectedFriend.isSelf && (friend.isSelf || friend.id === userId)) {
                            return {
                                ...friend,
                                lastMessage: textMessage.text,
                                lastMessageTime: textMessage.timestamp,
                                imageUrl: null,
                            };
                        }
                        if (!selectedFriend.isSelf && friend.id === selectedFriend.id) {
                            return {
                                ...friend,
                                lastMessage: textMessage.text,
                                lastMessageTime: textMessage.timestamp,
                            };
                        }
                        return friend;
                    });
                    return updated.sort((a, b) => {
                        if (a.isOnline !== b.isOnline) {
                            return b.isOnline ? 1 : -1;
                        }
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                        return timeB - timeA;
                    });
                });
            } else {
                // Multiple images or images only - send text first (if any), then images
                if (hasText) {
                    const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    const textMessage = {
                        senderId: userId,
                        receiverId: receiverId,
                        text: input.trim(),
                        timestamp: new Date().toISOString(),
                        avatar: nickname,
                        replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, imageUrl: replyTo.imageUrl, senderId: replyTo.senderId } : null,
                        clientId
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
                    const clientId = `client_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`;
                    const imageMessage = {
                        senderId: userId,
                        receiverId: receiverId,
                        text: null,
                        imageUrl: imageUrl,
                        timestamp: new Date(Date.now() + index).toISOString(), // Slight delay to maintain order
                        avatar: nickname,
                        clientId
                    };

                    socket.emit('send_message', imageMessage);

                    setMessages((prevMessages) => {
                        const updatedMessages = [...prevMessages, { ...imageMessage, self: true }];
                        return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
                    });

                    setDms((prevDms) => [...prevDms, { ...imageMessage, self: true, avatar: nickname }]);
                });

                setInput('');
                setImageQueue([]);
                setReplyTo(null);

                //Update messageList and sort by lastMessageTime (including self-messages for "Other Device")
                const lastMessage = hasText ? input.trim() : '[Image]';
                const lastImageUrl = imageUrls && imageUrls.length > 0 ? imageUrls[0] : null;
                const currentTime = new Date().toISOString();
                
                // Update self message state if sending to self
                if (selectedFriend.isSelf) {
                    setSelfLastMessage(lastMessage);
                    setSelfLastMessageTime(currentTime);
                    setSelfLastImageUrl(lastImageUrl);
                }
                
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) => {
                        // For self-messages, update if friend has isSelf flag or id matches userId
                        if (selectedFriend.isSelf && (friend.isSelf || friend.id === userId)) {
                            return {
                                ...friend,
                                lastMessage: lastMessage,
                                lastMessageTime: currentTime,
                                imageUrl: lastImageUrl,
                            };
                        }
                        // For regular messages
                        if (!selectedFriend.isSelf && friend.id === selectedFriend.id) {
                            return {
                                ...friend,
                                lastMessage: lastMessage,
                                lastMessageTime: currentTime,
                            };
                        }
                        return friend;
                    });
                    // Sort: online first, then by lastMessageTime (most recent first)
                    return updated.sort((a, b) => {
                        if (a.isOnline !== b.isOnline) {
                            return b.isOnline ? 1 : -1; // Online users first
                        }
                        const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : (a.addedAt ? new Date(a.addedAt).getTime() : 0);
                        const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : (b.addedAt ? new Date(b.addedAt).getTime() : 0);
                        return timeB - timeA;
                    });
                });
            }
        }
    };

    // Used for emoji panel - sends immediately (not queued)
    const handleImageUpload = (imageUrl, isEmoji = false) => {
        // Ensure socket is connected before sending
        if (!socket.connected) {
            console.warn('Socket not connected, attempting to reconnect...');
            socket.connect();
            if (userId) {
                setTimeout(() => socket.emit('join_room', userId), 1000);
            }
        }
        
        if (imageUrl && selectedFriend) {
            const receiverId = selectedFriend.isSelf ? userId : selectedFriend.id;
            const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newMessage = {
                senderId: userId,
                receiverId: receiverId,
                text: input.trim() || null,
                imageUrl: imageUrl,
                timestamp: new Date().toISOString(),
                avatar: nickname,
                replyTo: replyTo ? { id: replyTo.id, text: replyTo.text, imageUrl: replyTo.imageUrl, senderId: replyTo.senderId } : null,
                clientId,
                isEmoji: isEmoji
            };

            console.log('Sending image message:', newMessage);

            socket.emit('send_message', newMessage);

            setMessages((prevMessages) => {
                const updatedMessages = [...prevMessages, { ...newMessage, self: true }];
                return updatedMessages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            });

            setDms((prevDms) => [...prevDms, { ...newMessage, self: true, avatar: nickname }]);

            setInput('');
            setReplyTo(null);

                //Update messageList to show latest messages with image indicator and sort (including self-messages for "Other Device")
                // Update self message state if sending to self
                if (selectedFriend.isSelf) {
                    setSelfLastMessage(newMessage.text || '[Image]');
                    setSelfLastMessageTime(newMessage.timestamp);
                    setSelfLastImageUrl(imageUrl || null);
                }
                
                setFriends((prevFriends) => {
                    const updated = prevFriends.map((friend) => {
                        // For self-messages, update if friend has isSelf flag or id matches userId
                        if (selectedFriend.isSelf && (friend.isSelf || friend.id === userId)) {
                            return {
                                ...friend,
                                lastMessage: newMessage.text || '[Image]',
                                lastMessageTime: newMessage.timestamp,
                                imageUrl: imageUrl,
                            };
                        }
                        // For regular messages
                        if (!selectedFriend.isSelf && friend.id === selectedFriend.id) {
                            return {
                                ...friend,
                                lastMessage: newMessage.text || '[Image]',
                                lastMessageTime: newMessage.timestamp,
                                imageUrl: imageUrl,
                            };
                        }
                        return friend;
                    });
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
        // Send the emoji as an image message with isEmoji flag
        handleImageUpload(imageUrl, true);
    };

    const handleDeleteDMs = async () => {
        if (selectedFriend) {
            try {
                await axios.post(
                    `${process.env.REACT_APP_SERVER_DOMAIN}/dm/delete`,
                    { friendId: selectedFriend.id },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                alert(t('toast.dmDeleted'));
                setDms([]);
            } catch (error) {
                console.error('Error deleting DM history:', error);
            }
        }
    };

    const handleDeleteMessage = async (message) => {
        if (!message.id) {
            console.error('Message ID is missing');
            return;
        }
        try {
            await axios.delete(
                `${process.env.REACT_APP_SERVER_DOMAIN}/dm/message/${message.id}`,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setDms((prevDms) => prevDms.filter((dm) => dm.id !== message.id));
            setMessages((prevMessages) => prevMessages.filter((msg) => msg.id !== message.id));
        } catch (error) {
            console.error('Error deleting message:', error);
            alert(error.response?.data?.error || t('toast.deleteError'));
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
            'chat': t('sections.chat'),
            'friend-list': t('sections.friendList'),
            'add-friend': t('sections.addFriend'),
            'profile': t('sections.profile'),
            'settings': t('sections.settings')
        };

        const displayName = sectionNames[section];
        if (displayName) {
            badge.textContent = displayName;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    };

    // Update badge when section changes or language changes
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
    }, [activeSection, token, i18n.language]);

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
                                <h5 className="modal-title">{t('notifications.enableTitle')}</h5>
                                <button type="button" className="btn-close" onClick={handleDismissNotification}></button>
                            </div>
                            <div className="modal-body">
                                <p>{t('notifications.recommend')}</p>
                                <p>{t('notifications.dismiss')}</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary" onClick={handleRequestNotificationPermission}>
                                    {t('notifications.enable')}
                                </button>
                                <button className="btn btn-secondary" onClick={handleDismissNotification}>
                                    {t('notifications.noThanks')}
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
                                            messages={[
                                                ...(userId && showMultiDevice ? [{
                                                    id: userId,
                                                    username: username,
                                                    nickname: t('friendList.multiDevice'),
                                                    text: selfLastMessage || null,
                                                    imageUrl: selfLastImageUrl || null,
                                                    timestamp: selfLastMessageTime || null,
                                                    avatar: avatar,
                                                    isOnline: false,
                                                    isSelf: true,
                                                }] : []),
                                                ...friends.map(friend => ({
                                                    id: friend.id,
                                                    username: friend.username,
                                                    nickname: friend.nickname,
                                                    text: friend.lastMessage || null,
                                                    imageUrl: friend.imageUrl || null,
                                                    timestamp: friend.lastMessageTime || friend.addedAt || null,
                                                    avatar: friend.avatar,
                                                    isOnline: friend.isOnline,
                                                }))
                                            ]}
                                            onSelectMessage={(msg) => {
                                                if (msg.isSelf) {
                                                    handleSelectFriend({ id: userId, nickname: t('friendList.multiDevice'), avatar, isSelf: true });
                                                } else {
                                                    handleSelectFriendMobile(msg);
                                                }
                                            }}
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
                                            userId={userId}
                                            nickname={nickname}
                                            avatar={avatar}
                                            showMultiDevice={showMultiDevice}
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
                                            onRemoveFriend={selectedFriend.isSelf ? async () => {
                                                try {
                                                    await axios.post(
                                                        `${process.env.REACT_APP_SERVER_DOMAIN}/dm/delete`,
                                                        { friendId: userId },
                                                        { headers: { Authorization: `Bearer ${token}` } }
                                                    );
                                                    alert(t('toast.dmDeleted'));
                                                    setDms([]);
                                                    setSelectedFriend(null);
                                                } catch (error) {
                                                    console.error('Error deleting DM history:', error);
                                                    alert(t('toast.deleteError'));
                                                }
                                            } : () => {
                                                handleRemoveFriend(selectedFriend.id);
                                                setSelectedFriend(null);
                                            }}
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
                                            showMultiDevice={showMultiDevice}
                                            onToggleMultiDevice={() => {
                                                const newValue = !showMultiDevice;
                                                setShowMultiDevice(newValue);
                                                localStorage.setItem('showMultiDevice', JSON.stringify(newValue));
                                            }}
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
                                        replyTo={replyTo}
                                        onCancelReply={() => setReplyTo(null)}
                                        onReply={(message) => setReplyTo(message)}
                                        onDeleteMessage={handleDeleteMessage}
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
                                        messages={[
                                            ...(userId && showMultiDevice ? [{
                                                id: userId,
                                                username: username,
                                                nickname: t('friendList.multiDevice'),
                                                text: selfLastMessage || null,
                                                imageUrl: selfLastImageUrl || null,
                                                timestamp: selfLastMessageTime || null,
                                                avatar: avatar,
                                                isOnline: false,
                                                isSelf: true,
                                            }] : []),
                                            ...friends.map(friend => ({
                                                id: friend.id,
                                                username: friend.username,
                                                nickname: friend.nickname,
                                                text: friend.lastMessage || null,
                                                imageUrl: friend.imageUrl || null,
                                                timestamp: friend.lastMessageTime || friend.addedAt || null,
                                                avatar: friend.avatar,
                                                isOnline: friend.isOnline,
                                            }))
                                        ]}
                                        onSelectMessage={(msg) => {
                                            if (msg.isSelf) {
                                                handleSelectFriend({ id: userId, nickname: t('friendList.multiDevice'), avatar, isSelf: true });
                                            } else {
                                                handleSelectFriend(msg);
                                            }
                                        }}
                                        unreadMessagesCount={unreadMessagesCount}
                                    />
                                )}

                                {activeSection === 'friend-list' && (
                                    <FriendList
                                        friends={friends}
                                        onSelectFriend={(friend) => {
                                            handleSelectFriend(friend);
                                        }}
                                        userId={userId}
                                        nickname={nickname}
                                        avatar={avatar}
                                        showMultiDevice={showMultiDevice}
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
                                            onReply={(message) => setReplyTo(message)}
                                            onDeleteMessage={handleDeleteMessage}
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
                                            replyTo={replyTo}
                                            onCancelReply={() => setReplyTo(null)}
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
                                        onRemoveFriend={selectedFriend.isSelf ? async () => {
                                            try {
                                                await axios.post(
                                                    `${process.env.REACT_APP_SERVER_DOMAIN}/dm/delete`,
                                                    { friendId: userId },
                                                    { headers: { Authorization: `Bearer ${token}` } }
                                                );
                                                alert(t('toast.dmDeleted'));
                                                setDms([]);
                                                setSelectedFriend(null);
                                            } catch (error) {
                                                console.error('Error deleting DM history:', error);
                                                alert(t('toast.deleteError'));
                                            }
                                        } : () => {
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
                                        showMultiDevice={showMultiDevice}
                                        onToggleMultiDevice={() => {
                                            const newValue = !showMultiDevice;
                                            setShowMultiDevice(newValue);
                                            localStorage.setItem('showMultiDevice', JSON.stringify(newValue));
                                        }}
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