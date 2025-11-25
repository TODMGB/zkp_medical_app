// src/routes/users.routes.js
const { Router } = require('express');
const userController = require('../controllers/user.controller'); // CHANGED: 引入controller

const router = Router();

// Define routes and map them to controller functions
router.post('/', userController.createUser);
router.get('/:id', userController.getUserById);
router.get('/rpc/:id', userController.getUserByIdViaRpc);

module.exports = router;