// Application constants
// Usage: import { DEFAULT_AVATAR } from '../constants';

/**
 * Default avatar image path for users without custom avatars
 */
export const DEFAULT_AVATAR = 'avatar.jpg';

/**
 * API endpoints configuration
 */
export const API_ENDPOINTS = {
    BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
    AUTH: {
        LOGIN: '/login',
        REGISTER: '/register'
    },
    USERS: {
        SEARCH: '/users/search',
        UPDATE: '/user/update'
    },
    FRIENDS: {
        LIST: '/friends',
        ADD: '/friend/add',
        ACCEPT: '/friend/accept',
        REMOVE: '/friend/remove',
        REQUESTS: '/friend/requests',
        RESPOND: '/friend/respond'
    },
    MESSAGES: {
        SEND: '/messages',
        LIST: '/messages',
        DM_SEND: '/dm/send',
        DM_GET: '/dm',
        DM_DELETE: '/dm/delete'
    }
};

/**
 * Socket.io event names
 */
export const SOCKET_EVENTS = {
    JOIN_ROOM: 'join_room',
    LEAVE_ROOM: 'leave_room',
    SEND_MESSAGE: 'send_message',
    RECEIVE_MESSAGE: 'receive_message',
    SEND_FRIEND_REQUEST: 'send_friend_request',
    RECEIVE_FRIEND_REQUEST: 'receive_friend_request',
    RESPOND_FRIEND_REQUEST: 'respond_friend_request',
    FRIEND_REQUEST_RESPONDED: 'friend_request_responded',
    UPDATE_FRIEND_LIST: 'update_friend_list',
    FRIEND_STATUS_UPDATE: 'friend_status_update'
};