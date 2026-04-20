const crypto = require('crypto');
require('dotenv').config();

const getTurnCredentials = (req, res) => {
    // Determine the TURN URLs from env, or use defaults for demonstration
    // Multiple URLs can be comma separated
    const turnUrls = process.env.TURN_URLS 
        ? process.env.TURN_URLS.split(',') 
        : ['turn:global.turn.twilio.com:3478?transport=udp', 'turn:global.turn.twilio.com:3478?transport=tcp'];
    
    const turnSecret = process.env.TURN_SECRET;
    
    // Fallback STUN 
    const defaultStun = { urls: 'stun:stun.l.google.com:19302' };

    // If no secret is configured, just return public STUN
    if (!turnSecret) {
        return res.status(200).json({
            iceServers: [defaultStun]
        });
    }

    try {
        // Time-limited credentials (valid for 24 hours)
        const ttl = 24 * 60 * 60; 
        const timestamp = Math.floor(Date.now() / 1000) + ttl;
        const username = `${timestamp}:${req.user.id}`; // using the authenticated user id
        
        // HMAC SHA1 signature
        const hmac = crypto.createHmac('sha1', turnSecret);
        hmac.update(username);
        const password = hmac.digest('base64');
        
        const iceServers = [
            defaultStun,
            ...turnUrls.map(url => ({
                urls: url.trim(),
                username: username,
                credential: password
            }))
        ];

        res.status(200).json({ iceServers });
    } catch (error) {
        console.error('Error generating TURN credentials:', error);
        res.status(500).json({ message: 'Failed to generate connection credentials' });
    }
};

module.exports = { getTurnCredentials };
