// src/routes/index.js
const { Router } = require('express');
const authRouter = require('./auth.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// HTTP接口路由（供API Gateway调用）
router.use('/auth', authRouter);

module.exports = router;