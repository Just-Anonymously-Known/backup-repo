const express = require('express');
const router = express.Router();
const { sendMessage, getMessages } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

router.post('/', verifyToken, sendMessage);
router.get('/', verifyToken, getMessages);

module.exports = router;