const express = require('express');
const router = express.Router();
const { getTurnCredentials } = require('../controllers/turnController');

// No auth required — open to all guests
router.get('/', getTurnCredentials);

module.exports = router;
