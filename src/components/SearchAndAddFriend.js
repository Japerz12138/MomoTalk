import React, { useState } from 'react';
import axios from 'axios';
import styles from '../styles';

function SearchAndAddFriend({ token, onAddFriend }) {
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);

    const handleSearch = async () => {
        try {
            const response = await axios.get('http://localhost:5000/users/search', {
                headers: { Authorization: token },
                params: { query },
            });
            setSearchResults(response.data);
        } catch (error) {
            console.error('Error searching for users:', error);
        }
    };

    return (
        <div style={styles.searchContainer}>
            <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by username"
                style={styles.input}
            />
            <button onClick={handleSearch} style={styles.button}>Search</button>
            <ul style={styles.searchResults}>
                {searchResults.map(user => (
                    <li key={user.id} style={styles.searchItem}>
                        {user.nickname || user.username}
                        <button onClick={() => onAddFriend(user.username)} style={styles.addButton}>Add Friend</button>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default SearchAndAddFriend;
