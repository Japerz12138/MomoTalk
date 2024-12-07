import React, { useState } from 'react';
import axios from 'axios';

function SearchAndAddFriend({ token, onAddFriend }) {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async () => {
        try {
            const response = await axios.get('http://localhost:5000/users/search', {
                headers: { Authorization: `Bearer ${token}` },
                params: { query },
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error('Error searching for users:', error);
        }
    };

    return (
        <div className="mb-4" style={{ marginTop: '10px', marginLeft: '5px', marginRight: '5px'}} >
            <div className="input-group mb-3">
                <input
                    type="text"
                    className="form-control"
                    placeholder="Search by username"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
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
            <ul className="list-group">
                {searchResults.map(user => (
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
        </div>
    );
}

export default SearchAndAddFriend;
