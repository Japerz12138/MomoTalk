import React, { useState } from 'react';
import axios from 'axios';

function SearchAndAddFriend({ token, loggedInUsername, loggedInMomoCode, friendsList = [], onAddFriend }) {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState('');

    const handleSearch = async () => {
        setError('');
        
        // Remove spaces and dashes for validation
        const cleanQuery = query.replace(/[\s-]/g, '');
        
        if (cleanQuery.length !== 12 || !/^\d+$/.test(cleanQuery)) {
            setError('Please enter a valid 12-digit Momo Code');
            setSearchResults([]);
            return;
        }

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

            if (filteredResults.length === 0 && response.data.length > 0) {
                setError('This user is already your friend or is yourself');
            } else if (response.data.length === 0) {
                setError('User not found with this Momo Code');
            }

            setSearchResults(filteredResults);
        } catch (error) {
            console.error('Error searching for users:', error);
            setError('Error searching for users');
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents form submission if inside a form
            handleSearch();
        }
    };

    const formatMomoCodeDisplay = (code) => {
        if (!code) return '';
        return code.replace(/(\d{4})(\d{4})(\d{4})/, '$1-$2-$3');
    };

    return (
        <div className="mb-4" style={{ marginTop: '10px', marginLeft: '8px', marginRight: '5px' }}>
            {/* Display user's own Momo Code */}
            {loggedInMomoCode && (
                <div className="alert alert-info" style={{ marginBottom: '15px', textAlign: 'center', backgroundColor: 'rgba(255, 119, 155, 0.2)', border: '1px solid #FF95AA'}}>
                    <strong style={{ color: 'rgba(255, 97, 126, 0.8)' }}>Your Momo Code:</strong>
                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '5px', letterSpacing: '2px', color: 'rgba(255, 65, 100, 0.8)' }}>
                        {loggedInMomoCode}
                    </div>
                    <small style={{ color: 'rgba(255, 97, 126, 0.8)' }}>Share this code with friends to connect!</small>
                </div>
            )}

            <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Enter Momo Code (e.g., 1234-5678-9012)"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    maxLength={14}
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

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {searchResults.length === 0 && !error ? (
                <div
                    style={{
                        textAlign: 'center',
                        marginTop: '30px',
                        color: '#6c757d',
                    }}
                >
                    <i className="bi bi-search" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
                    <p style={{ fontSize: '1.2rem' }}>Start a friendship!</p>
                    <p style={{ fontSize: '0.9rem' }}>Enter a 12-digit Momo Code</p>
                </div>
            ) : (
                searchResults.length > 0 && (
                    <ul className="list-group">
                        {searchResults.map((user) => (
                            <li
                                key={user.id}
                                className="list-group-item d-flex justify-content-between align-items-center"
                            >
                                <div>
                                    <div>{user.nickname || user.username}</div>
                                    <small className="text-muted">Momo Code: {user.momo_code}</small>
                                </div>
                                <button
                                    className="btn btn-sm btn-success"
                                    onClick={() => onAddFriend(user.momo_code)}
                                >
                                    Add Friend
                                </button>
                            </li>
                        ))}
                    </ul>
                )
            )}
        </div>
    );
}

export default SearchAndAddFriend;
