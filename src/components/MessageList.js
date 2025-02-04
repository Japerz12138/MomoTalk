import React, { useState } from 'react';
import { DEFAULT_AVATAR } from '../constants';

function MessageList({ messages, onSelectMessage, unreadMessagesCount }) {
    const [selectedMessageId, setSelectedMessageId] = useState(null);

    const handleSelectMessage = (msg) => {
        setSelectedMessageId(msg.id);
        onSelectMessage(msg);
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return ''; //IF is new chat, leave time area empty

        const date = new Date(timestamp);
        return (
            date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }) +
            ' ' +
            date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
        );
    };

    const truncateNickname = (nickname) => {
        return nickname.length > 12 ? `${nickname.slice(0, 12)}...` : nickname;
    };

    //Sort the message with time stamp
    const sortedMessages = [...messages].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return (
        <div className="list-group" style={{ marginTop: '69px', height: 'calc(100vh - 69px)', position: 'relative' }}>
            {sortedMessages.length > 0 ? (
                sortedMessages.map((msg) => (
                    <div
                        key={msg.id}
                        className={`list-group-item d-flex align-items-center ${
                            msg.id === selectedMessageId ? 'active' : ''
                        }`}
                        onClick={() => handleSelectMessage(msg)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div style={{ position: 'relative' }}>
                            <img
                                src={msg.avatar || DEFAULT_AVATAR}
                                alt={msg.nickname}
                                className="rounded-circle me-2"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                            />
                            {msg.isOnline && (
                                <span
                                    style={{
                                        position: 'absolute',
                                        bottom: 0,
                                        right: '7px',
                                        width: '15px',
                                        height: '15px',
                                        backgroundColor: 'green',
                                        borderRadius: '50%',
                                        border: '3px solid white',
                                    }}
                                ></span>
                            )}
                        </div>
                        <div className="flex-grow-1">
                            <div className="d-flex justify-content-between">
                                <strong title={msg.nickname}>
                                    {truncateNickname(msg.nickname)}
                                    {(unreadMessagesCount[msg.id] || 0) > 0 && (
                                        <span
                                            className="badge bg-danger rounded-pill"
                                            style={{
                                                marginLeft: '8px',
                                                fontSize: '0.7rem',
                                            }}
                                        >
                                        {unreadMessagesCount[msg.id]}
                                    </span>
                                    )}
                                </strong>
                                <small>{formatDate(msg.timestamp)}</small>
                            </div>
                            <p className="mb-0 text-muted">
                                {msg.text.length > 10 ? `${msg.text.slice(0, 10)}...` : msg.text}
                            </p>
                        </div>
                    </div>
                ))
            ) : (
                <div
                    className="d-flex flex-column align-items-center justify-content-center text-muted"
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                    }}
                >
                    <i className="bi bi-chat-left-dots" style={{ fontSize: '3rem', opacity: 0.5 }}></i>
                    <div style={{ marginTop: '10px' }}>Pick a friend to talk to!</div>
                </div>
            )}
        </div>
    );

}

export default MessageList;

