CREATE TABLE users (
                       id INT PRIMARY KEY AUTO_INCREMENT,
                       username VARCHAR(50) NOT NULL UNIQUE,
                       email VARCHAR(100) NOT NULL UNIQUE,
                       password VARCHAR(255) NOT NULL,
                       nickname VARCHAR(50) NOT NULL,
                       avatar VARCHAR(255) DEFAULT NULL
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
                     timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                     FOREIGN KEY (sender_id) REFERENCES users(id),
                     FOREIGN KEY (receiver_id) REFERENCES users(id)
);

CREATE INDEX idx_friends_user_friend ON friends (user_id, friend_id);
CREATE INDEX idx_dms_sender_receiver ON dms (sender_id, receiver_id, timestamp);
