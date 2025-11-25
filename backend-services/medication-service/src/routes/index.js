// src/routes/index.js
const { Router } = require('express');
const medicationRouter = require('./medication.routes');
const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'UP',
    service: 'medication-service',
    version: '1.0.0'
  });
});

router.use('/medication', medicationRouter);

module.exports = router;