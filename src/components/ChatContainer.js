const ChatContainer = ({ messages, selectedFriend }) => {
    return (
        <div className="chat-container p-3" style={{ marginTop: '69px', height: 'calc(100vh - 69px)', overflowY: 'auto' }}>
            {selectedFriend ? (
                messages && messages.length > 0 ? (
                    messages.map((msg, index) => (
                        <div key={index} className={`chat-bubble ${msg.self ? 'self' : 'other'}`}>
                            {msg.text}
                        </div>
                    ))
                ) : (
                    <div className="text-muted">No messages yet. Start the conversation!</div>
                )
            ) : (
                <div className="text-muted">Select a friend to start chatting.</div>
            )}
        </div>
    );
};

export default ChatContainer;
