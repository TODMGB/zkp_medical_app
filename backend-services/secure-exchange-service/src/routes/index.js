// src/routes/index.js
const { Router } = require('express');
const exchangeRouter = require('./exchange.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'secure-exchange-service',
    timestamp: new Date().toISOString()
  });
});

router.use('/secure-exchange', exchangeRouter);

module.exports = router;