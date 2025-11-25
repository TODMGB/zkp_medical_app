// src/routes/index.js
const { Router } = require('express');
const usersRouter = require('./users.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

router.use('/users', usersRouter);

module.exports = router;