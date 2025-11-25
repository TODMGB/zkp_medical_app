// src/controllers/user.controller.js
const userService = require('../services/user.service');
/**
Controller to handle creating a new user.
@param {object} req - Express request object
@param {object} res - Express response object
@param {function} next - Express next middleware function
*/
async function createUser(req, res, next) {
    try {
        const { username, email } = req.body;
        // 1. Basic input validation
        if (!username || !email) {
            return res.status(400).json({ message: 'Username and email are required' });
        }
        // 2. Call the service layer to handle business logic
        const newUser = await userService.createUser({ username, email });
        // 3. Send the response
        res.status(201).json(newUser);
    } catch (error) {
        // 4. Pass errors to the centralized error handler
        next(error);
    }
}

/**
Controller to handle fetching a user by their ID.
@param {object} req - Express request object
@param {object} res - Express response object
@param {function} next - Express next middleware function
*/
async function getUserById(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ message: 'Invalid user ID format' });
        }
        const user = await userService.findUserById(id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
}

/**
 * Controller to handle fetching a user by their ID via gRPC
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
async function getUserByIdViaRpc(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await userService.findUserByIdViaRpc(id); // 调用新的service方法
    
    if (!user) {
      return res.status(404).json({ message: 'User not found (via RPC)' });
    }
    
    res.status(200).json({ source: 'rpc', user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
    createUser,
    getUserById,
    getUserByIdViaRpc,
};