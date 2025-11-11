CREATE TABLE users (
                       id INT PRIMARY KEY AUTO_INCREMENT,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       nickname VARCHAR(50) NOT NULL,
                       avatar VARCHAR(255) DEFAULT NULL,
                       session_token VARCHAR(255) DEFAULT NULL,
                       momo_code VARCHAR(14) NOT NULL UNIQUE
);

CREATE TABLE user_sessions (
                       id INT AUTO_INCREMENT PRIMARY KEY,
                       user_id INT NOT NULL,
                       session_id VARCHAR(128) NOT NULL UNIQUE,
                       refresh_token_hash CHAR(64) NOT NULL,
                       refresh_expires_at DATETIME NOT NULL,
                       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                       last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                       INDEX idx_user_sessions_user_id (user_id),
                       FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE messages (
                          id INT PRIMARY KEY AUTO_INCREMENT,
                          user_id INT NOT NULL,
                          text TEXT NOT NULL,
                          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                          FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE friends (
                         id INT AUTO_INCREMENT PRIMARY KEY,
                         user_id INT NOT NULL,
                         friend_id INT NOT NULL,
                         status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
                         created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                         updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                         UNIQUE KEY unique_friendship (user_id, friend_id),
                         FOREIGN KEY (user_id) REFERENCES users(id),
                         FOREIGN KEY (friend_id) REFERENCES users(id)
);

CREATE TABLE dms (
                     id INT AUTO_INCREMENT PRIMARY KEY,
                     sender_id INT NOT NULL,
                     receiver_id INT NOT NULL,
                     text TEXT NOT NULL,
                     image_url VARCHAR(500) DEFAULT NULL,
                     message_type ENUM('text', 'image', 'both') DEFAULT 'text' AFTER image_url,
                     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (sender_id) REFERENCES users(id),
                     FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE TABLE favorite_emojis (
                     id INT AUTO_INCREMENT PRIMARY KEY,
                     user_id INT NOT NULL,
                     image_url VARCHAR(500) NOT NULL,
                     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                     INDEX idx_user_id (user_id)
);

CREATE TABLE uploaded_images (
    id INT AUTO_INCREMENT PRIMARY KEY,
    md5_hash VARCHAR(32) NOT NULL UNIQUE,
    file_url VARCHAR(500) NOT NULL,
    file_type ENUM('avatar', 'chat') NOT NULL,
    file_size INT NOT NULL,
    upload_count INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_md5_hash (md5_hash),
    INDEX idx_file_type (file_type)
);

CREATE INDEX idx_friends_user_friend ON friends (user_id, friend_id);
CREATE INDEX idx_dms_sender_receiver ON dms (sender_id, receiver_id, timestamp);
