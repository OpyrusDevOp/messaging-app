/**
  * @param { import('express')} express
  * @param {import('sqlite3').Database} db
  * @param {import('jsonwebtoken')} jwt

  * @returns { import('express').Router()}
  *
  **/
function SetAuthRouter(express, db, jwt) {
  const router = express.Router();
  const bcrypt = require('bcrypt');

  router.post('/signup', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    db.run('INSERT INTO users (username, password) VALUES (?, ?)',
      [username, hashedPassword],
      function (err) {
        if (err) return res.status(400).json({ error: 'Username already exists' });

        const token = jwt.sign({ id: this.lastID, username }, process.env.JWT_SECRET);
        res.json({ token });
      });
  });

  router.post('/signin', async (req, res) => {
    const { username, password } = req.body;

    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err || !user) return res.status(400).json({ error: 'User not found' });

      const validPassword = await bcrypt.compare(password, user.password);
      if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

      const token = jwt.sign({ id: user.id, username }, process.env.JWT_SECRET);
      res.json({ token });
    });
  });
  return router;
}

module.exports = SetAuthRouter;
