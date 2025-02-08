const { Router } = require('express');
const multer = require('multer');
const path = require('path');

/**
  * @param {import('express')} express
  * @param {Function} authenticateToken
  * @param {import('sqlite3').Database} db
  * @returns {Router()}
  **/

function SetConvRouter(express, authenticateToken, db) {
  const router = express.Router();


  router.get('/:id', authenticateToken, (req, res) => {
    const conversationId = req.params.id;
    const userId = req.user.id;

    db.get(`
    SELECT c.*, 
           GROUP_CONCAT(u.id) as participant_ids,
           GROUP_CONCAT(u.username) as participant_usernames,
           (
             SELECT content 
             FROM messages 
             WHERE conversation_id = c.id 
             ORDER BY created_at DESC 
             LIMIT 1
           ) as last_message,
           (
             SELECT created_at 
             FROM messages 
             WHERE conversation_id = c.id 
             ORDER BY created_at DESC 
             LIMIT 1
           ) as last_message_date,
           (
             SELECT COUNT(*) 
             FROM messages 
             WHERE conversation_id = c.id 
             AND sender_id != ? 
             AND read_by IS NULL
           ) as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    WHERE c.id = ? AND EXISTS (
      SELECT 1 
      FROM conversation_participants 
      WHERE conversation_id = c.id 
      AND user_id = ?
    )
    GROUP BY c.id
  `, [userId, conversationId, userId], (err, conversation) => {
      if (err) return res.status(500).json({ error: 'Database error' });
      if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

      // Format the conversation data
      const participants = conversation.participant_ids.split(',').map((id, index) => ({
        id: parseInt(id),
        username: conversation.participant_usernames.split(',')[index]
      }));

      res.json({
        id: conversation.id,
        participants: participants.filter(p => p.id !== userId),
        lastMessage: conversation.last_message,
        lastMessageDate: conversation.last_message_date,
        unreadCount: conversation.unread_count,
        createdAt: conversation.created_at
      });
    });
  });
  router.get('/', authenticateToken, (req, res) => {
    db.all(`
    SELECT 
      c.id,
      c.created_at,
      json_group_array(json_object(
        'id', u.id,
        'username', u.username
      )) as participants,
      (
        SELECT json_object(
          'id', m.id,
          'content', m.content,
          'senderId', m.sender_id,
          'createdAt', m.created_at,
          'messageType', m.message_type
        )
        FROM messages m
        WHERE m.conversation_id = c.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) as last_message,
      (
        SELECT COUNT(*)
        FROM messages m
        WHERE m.conversation_id = c.id
        AND m.sender_id != ?
        AND (m.read_by IS NULL OR m.read_by NOT LIKE ?)
      ) as unread_count
    FROM conversations c
    JOIN conversation_participants cp ON c.id = cp.conversation_id
    JOIN users u ON cp.user_id = u.id
    WHERE c.id IN (
      SELECT conversation_id 
      FROM conversation_participants 
      WHERE user_id = ?
    )
    AND u.id != ?
    GROUP BY c.id
    ORDER BY last_message->>'createdAt' DESC NULLS LAST, c.created_at DESC
  `, [req.user.id, `%${req.user.id}%`, req.user.id, req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ error: 'Database error' });

      res.json(rows.map(row => ({
        ...row,
        participants: JSON.parse(row.participants),
        lastMessage: row.last_message ? JSON.parse(row.last_message) : null,
        unreadCount: row.unread_count
      })));
    });
  });

  router.get('/:id/messages', authenticateToken, (req, res) => {
    db.all(`SELECT m.*, 
       (SELECT json_group_array(value) 
        FROM json_each('[' || m.read_by || ']')) AS read_by
FROM messages m
WHERE m.conversation_id = ?
ORDER BY m.created_at DESC
LIMIT 50;
  `, [req.params.id], (err, messages) => {
      console.log(err);
      if (err) return res.status(500).json({ error: 'Database error' });
      res.json(messages);
    });
  });

  return router;
}

// Add file upload endpoint to your Express app
function setupFileUpload(app, express) {

  const storage = multer.diskStorage({
    destination: 'uploads/',
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const finalFileName = uniqueSuffix + path.extname(file.originalname);

      req.filename = finalFileName;

      cb(null, finalFileName);
    }
  });

  // File Filter Function
  const fileFilter = (req, file, cb) => {
    const allowedExtensions = /\.(jpeg|jpg|png|gif|mp4|webm|mp3|wav|pdf|doc|docx)$/i;
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif',
      'video/mp4', 'video/webm',
      'audio/mpeg', 'audio/wav',
      'application/pdf',
      'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const fileMime = file.mimetype;

    const isExtValid = allowedExtensions.test(fileExt);
    const isMimeValid = allowedMimes.includes(fileMime);

    console.log('File Name:', file.originalname);
    console.log('File Extension:', fileExt);
    console.log('File MIME Type:', fileMime);
    console.log('isExtValid:', isExtValid);
    console.log('isMimeValid:', isMimeValid);

    if (isExtValid && isMimeValid) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type!'));
  };

  // Multer Upload Middleware
  const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter
  });
  app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'no file uploaded' });
    }
    console.log('Unique Suffix:', req.uniqueSuffix);

    const fileUrl = `${process.env.SERVER_URL}/uploads/${req.filename}`;
    res.json({
      url: fileUrl,
      type: req.file.mimetype,
      filename: req.filename, // Returns the new filename with the unique suffix
    });
  });

  // Serve uploaded files
  app.use('/uploads', express.static('uploads'));
}
module.exports = { SetConvRouter, setupFileUpload };
