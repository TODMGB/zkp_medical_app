// src/routes/index.js
const { Router } = require('express');
const zkpRouter = require('./zkp.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'zkp-service',
    timestamp: new Date().toISOString()
  });
});

// ZKP 证明生成路由
router.use('/zkp', zkpRouter);

module.exports = router;