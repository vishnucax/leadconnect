const jwt = require('jsonwebtoken');
const { handleMatchmaking } = require('./matchmaking');
const { handleSignaling } = require('./signaling');

// Track active sessions by user ID to prevent multi-tab abuse
const activeUsers = new Map();
// Simple rate limiting per socket ID
const rateLimiters = new Map();

const isRateLimited = (socketId, limit = 20, windowMs = 5000) => {
    const now = Date.now();
    if (!rateLimiters.has(socketId)) {
        rateLimiters.set(socketId, { count: 1, resetAt: now + windowMs });
        return false;
    }
    
    const record = rateLimiters.get(socketId);
    if (now > record.resetAt) {
        record.count = 1;
        record.resetAt = now + windowMs;
        return false;
    }
    
    record.count++;
    if (record.count > limit) {
        return true;
    }
    return false;
};

const initSocket = (io) => {
    io.use((socket, next) => {
        const token = socket.handshake.auth.token;
        if (!token) return next(new Error('Authentication error'));

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) return next(new Error('Authentication error'));
            
            // Check if user is already connected elsewhere
            if (activeUsers.has(decoded.id)) {
                // Return an error, or alternatively disconnect the old socket
                // For safety, we block the new connection
                return next(new Error('Session already active in another window'));
            }

            socket.user = decoded;
            next();
        });
    });

    let onlineCount = 0;
    
    io.on('connection', (socket) => {
        // Enforce rate limiting wrapper on primary events
        const applyRateLimit = (event, handler) => {
            socket.on(event, (...args) => {
                if (isRateLimited(socket.id)) {
                    socket.emit('error', { message: 'Too many requests, slow down.' });
                    return;
                }
                handler(...args);
            });
        };

        onlineCount++;
        activeUsers.set(socket.user.id, socket.id);

        io.emit('onlineCount', onlineCount); 
        socket.emit('onlineCount', onlineCount);
        console.log(`New connection: ${socket.id} (Online: ${onlineCount})`);

        // We pass the socket directly to handlers, but they must use it safely
        handleMatchmaking(io, socket, applyRateLimit);
        handleSignaling(io, socket, applyRateLimit);

        socket.on('disconnect', () => {
            onlineCount = Math.max(0, onlineCount - 1);
            activeUsers.delete(socket.user.id);
            rateLimiters.delete(socket.id);
            io.emit('onlineCount', onlineCount);
            console.log(`User disconnected: ${socket.id} (Online: ${onlineCount})`);
        });
    });
};

module.exports = initSocket;
