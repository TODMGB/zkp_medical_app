// src/routes/index.js
const express = require('express');
const migrationRoutes = require('./migration.routes');

const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({ status: 'UP' });
});

// 迁移相关路由
router.use('/migration', migrationRoutes);

module.exports = router;