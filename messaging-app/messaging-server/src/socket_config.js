const socketIO = require('socket.io');
const multer = require('multer');
const path = require('path');

/**
  * @param {import('http').Server} server
  * @param {import('sqlite3').Database} db
  * @param {import('jsonwebtoken')} jwt
  */
function configSocketio(server, db, jwt) {

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/')
    },
    filename: (req, file, cb) => {
      // Create unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);

      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('Invalid file type!'));
    }
  });

  const io = socketIO(server, {
    cors: {
      origin: process.env.FRONTEND_ADDRESS, // Your Vite frontend URL
      methods: ["GET", "POST"],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  });
  const onlineUsers = new Map(); // userId -> Set of socket IDs
  const userSockets = new Map(); // socket.id -> userId

  // Socket middleware for authentication
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) return next(new Error('Authentication error'));
      socket.user = decoded;
      next();
    });
  });

  // Socket connection handling
  io.on('connection', (socket) => {
    console.log('User connected:', socket.user.id);

    if (!onlineUsers.has(socket.user.id)) {
      onlineUsers.set(socket.user.id, new Set());
    }
    onlineUsers.get(socket.user.id).add(socket.id);
    userSockets.set(socket.id, socket.user.id);

    // Join user to their personal room
    socket.join(`user:${socket.user.id}`);


    io.emit('user_connected', socket.user.id);

    // Send the current list of online users to the newly connected client
    socket.emit('users_online', Array.from(onlineUsers.keys()));

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);

      // Remove the socket ID from user's set of connections
      const userConnections = onlineUsers.get(socket.user.id);
      if (userConnections) {
        userConnections.delete(socket.id);

        // If user has no more active connections, remove them from online users
        if (userConnections.size === 0) {
          onlineUsers.delete(socket.user.id);
          io.emit('user_disconnected', socket.user.id);
        }
      }
      userSockets.delete(socket.id);
    });
    socket.on('get_online_status', ({ userIds }, callback) => {
      const statuses = userIds.reduce((acc, userId) => {
        acc[userId] = onlineUsers.has(userId);
        return acc;
      }, {});
      callback(statuses);
    });

    // Handle new message
    socket.on('send_message', async (data) => {
      console.log(data)
      const { conversationId, content, messageType, mediaUrl } = data;

      // Save message to database
      db.run(`INSERT INTO messages (conversation_id, sender_id, message_type, content, media_url)
            VALUES (?, ?, ?, ?, ?)`,
        [conversationId, socket.user.id, messageType, content, mediaUrl],
        function (err) {
          if (err) return console.error(err);

          // Get conversation participants
          db.all(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`,
            [conversationId],
            (err, participants) => {
              if (err) return console.error(err);
              console.log(participants);
              // Emit message to all participants
              participants.forEach(participant => {
                io.to(`user:${participant.user_id}`).emit('new_message', {
                  id: this.lastID,
                  conversationId,
                  sender_id: socket.user.id,
                  message_type: messageType,
                  content,
                  media_url: mediaUrl,
                  created_at: new Date()
                });
              });
            });
        });
    });

    // Handle typing indicator
    socket.on('typing', ({ conversationId, isTyping }) => {
      db.all(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`,
        [conversationId],
        (err, participants) => {
          if (err) return console.error(err);

          participants.forEach(participant => {
            if (participant.user_id !== socket.user.id) {
              io.to(`user:${participant.user_id}`).emit('user_typing', {
                conversationId,
                userId: socket.user.id,
                isTyping
              });
            }
          });
        });
    });

    // Handle read receipts
    socket.on('mark_read', ({ conversationId, messageId }) => {
      db.run(`UPDATE messages 
            SET read_by = CASE 
              WHEN read_by IS NULL THEN ? 
              ELSE read_by || ',' || ? 
            END
            WHERE id = ?`,
        [socket.user.id, socket.user.id, messageId],
        (err) => {
          if (err) return console.error(err);

          // Notify other participants
          db.all(`SELECT user_id FROM conversation_participants WHERE conversation_id = ?`,
            [conversationId],
            (err, participants) => {
              if (err) return console.error(err);

              participants.forEach(participant => {
                io.to(`user:${participant.user_id}`).emit('message_read', {
                  conversationId,
                  messageId,
                  userId: socket.user.id
                });
              });
            });
        });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.user.id);
    });
  });
}

module.exports = configSocketio;
