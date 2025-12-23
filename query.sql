CREATE TABLE users (
                       id INT PRIMARY KEY AUTO_INCREMENT,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       nickname VARCHAR(50) NOT NULL,
                       avatar VARCHAR(255) DEFAULT NULL,
                       birthday VARCHAR(5) DEFAULT NULL COMMENT 'MM-DD',
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
                     reply_to_id INT DEFAULT NULL,
                     reply_to_data TEXT DEFAULT NULL,
                     is_emoji TINYINT(1) DEFAULT 0,
                     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (sender_id) REFERENCES users(id),
                     FOREIGN KEY (receiver_id) REFERENCES users(id),
                     FOREIGN KEY (reply_to_id) REFERENCES dms(id) ON DELETE SET NULL
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

CREATE INDEX idx_dms_sender_receiver_timestamp ON dms (sender_id, receiver_id, timestamp DESC);

CREATE INDEX idx_dms_receiver_sender_timestamp ON dms (receiver_id, sender_id, timestamp DESC);

CREATE INDEX idx_dms_id_timestamp ON dms (id, timestamp DESC);

CREATE INDEX idx_dms_user_timestamp ON dms (sender_id, timestamp DESC);
CREATE INDEX idx_dms_receiver_timestamp ON dms (receiver_id, timestamp DESC);

-- NEW ADDED FOR GROUPS - 12/22/2025
CREATE TABLE groups (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    avatar VARCHAR(500) DEFAULT NULL,
    group_code VARCHAR(14) NOT NULL UNIQUE,
    signature VARCHAR(200) DEFAULT NULL,
    created_by INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_created_by (created_by),
    INDEX idx_group_code (group_code)
);

CREATE TABLE group_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    user_id INT NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_group_member (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_group_id (group_id),
    INDEX idx_user_id (user_id)
);

CREATE TABLE group_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_id INT NOT NULL,
    sender_id INT NOT NULL,
    text TEXT NOT NULL,
    image_url VARCHAR(500) DEFAULT NULL,
    message_type ENUM('text', 'image', 'both', 'system') DEFAULT 'text',
    reply_to_id INT DEFAULT NULL,
    reply_to_data TEXT DEFAULT NULL,
    is_emoji TINYINT(1) DEFAULT 0,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES group_messages(id) ON DELETE SET NULL,
    INDEX idx_group_timestamp (group_id, timestamp DESC),
    INDEX idx_sender_id (sender_id)
);
