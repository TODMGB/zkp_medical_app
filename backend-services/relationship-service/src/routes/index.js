// src/routes/index.js
const { Router } = require('express');
const relationshipRouter = require('./relationship.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

router.use('/relation', relationshipRouter);

module.exports = router;