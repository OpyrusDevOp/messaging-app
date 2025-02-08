require('dotenv').config();
const { env } = require('process');
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3');
const jwt = require('jsonwebtoken');

const app = express();
const http = require('http');

const server = http.createServer(app);

// Database initialization
const db = new sqlite3.Database('chat.db');
const dbSetup = require("./src/sqlitedb_setup.js");
dbSetup(db);

const configSocket = require("./src/socket_config.js");

configSocket(server, db, jwt);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
// CORS configuration
app.use(cors({
  origin: env.FRONTEND_ADDRESS,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const authRouter = require("./src/http_routes/auth_route.js");
const authRoute = authRouter(express, db, jwt);
app.use("/api/auth", authRoute);

const ConversationConfig = require("./src/http_routes/conversation_route.js");
const convRoute = ConversationConfig.SetConvRouter(express, authenticateToken, db);
app.use("/api/conversations", convRoute);

ConversationConfig.setupFileUpload(app, express);

app.get('/api/users/search', authenticateToken, (req, res) => {
  const { query } = req.query;

  db.all(`SELECT id, username FROM users 
WHERE username LIKE ? AND id != ?`,
    [`%${query}%`, req.user.id],
    (err, users) => {
      if (err) return res.status(500).json({ error: 'Server error' });
      res.json(users);
    });
});

const port = process.env.PORT || 3000;
server.listen(port, () => {
  console.log('Server running on port 3000');
});
