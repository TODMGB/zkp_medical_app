const { Router } = require('express');
const bundlerController = require('../controllers/bundler.controller');

const router = Router();

// POST /api/bundler/submit
router.post('/submit', bundlerController.submitUserOp);

module.exports = router;
