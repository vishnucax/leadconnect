const express = require('express');
const router = express.Router();
const { getTurnCredentials } = require('../controllers/turnController');
const { authenticate } = require('../middleware/authMiddleware');

router.get('/', authenticate, getTurnCredentials);

module.exports = router;
