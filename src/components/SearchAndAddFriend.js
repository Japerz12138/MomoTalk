import React, { useState } from 'react';
import axios from 'axios';

function SearchAndAddFriend({ token, loggedInUsername, friendsList = [], onAddFriend }) {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_SERVER_DOMAIN}/users/search`, {
                headers: { Authorization: `Bearer ${token}` },
                params: { query },
            });

            const filteredResults = response.data.filter(
                (user) =>
                    user.username !== loggedInUsername &&
                    Array.isArray(friendsList) &&
                    !friendsList.some((friend) => friend.username === user.username)
            );

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching for users:', error);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents form submission if inside a form
            handleSearch();
        }
    };

    return (
        <div className="mb-4" style={{ marginTop: '10px', marginLeft: '8px', marginRight: '5px' }}>
            <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search by username"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown} // Added Enter key functionality
                />
                <button
                    className="btn btn-primary"
                    type="button"
                    onClick={handleSearch}
                    style={{
                        backgroundColor: '#4C5B6F',
                        border: 'none',
                        color: 'white',
                    }}
                >
                    Search
                </button>
            </div>

            {searchResults.length === 0 ? (
                <div
                    style={{
                        textAlign: 'center',
                        marginTop: '30px',
                        color: '#6c757d',
                    }}
                >
                    <i className="bi bi-search" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                    <p style={{ fontSize: '1.2rem' }}>Start a friendship!</p>
                </div>
            ) : (
                <ul className="list-group">
                    {searchResults.map((user) => (
                        <li
                            key={user.id}
                            className="list-group-item d-flex justify-content-between align-items-center"
                        >
                            {user.nickname || user.username}
                            <button
                                className="btn btn-sm btn-success"
                                onClick={() => onAddFriend(user.username)}
                            >
                                Add Friend
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export default SearchAndAddFriend;
