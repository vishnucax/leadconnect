const crypto = require('crypto');
require('dotenv').config();

const getTurnCredentials = (req, res) => {
    // Determine the TURN URLs from env, or use robust defaults for testing
    // E.g., TURN_URLS=turn:global.turn.twilio.com:3478,turns:global.turn.twilio.com:443?transport=tcp
    const turnUrls = process.env.TURN_URLS 
        ? process.env.TURN_URLS.split(',') 
        : [
            'turn:global.turn.twilio.com:3478?transport=udp',
            'turn:global.turn.twilio.com:3478?transport=tcp',
            'turns:global.turn.twilio.com:443?transport=tcp' // Strict campus networks bypass
          ];
    
    const turnSecret = process.env.TURN_SECRET;
    
    // Robust STUN Fallback
    const stuns = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ];

    // If no secret is configured, return STUNs
    if (!turnSecret) {
        console.warn('TURN_SECRET not found in .env, falling back to STUN-only logic.');
        return res.status(200).json({
            iceServers: stuns
        });
    }

    try {
        // Time-limited credentials (valid for 24 hours)
        const ttl = 24 * 60 * 60; 
        const timestamp = Math.floor(Date.now() / 1000) + ttl;
        const username = `${timestamp}:${req.user.id}`; 
        
        // HMAC SHA1 signature
        const hmac = crypto.createHmac('sha1', turnSecret);
        hmac.update(username);
        const password = hmac.digest('base64');
        
        const iceServers = [
            ...stuns,
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
