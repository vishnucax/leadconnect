const { handleMatchmaking } = require('./matchmaking');
const { handleSignaling } = require('./signaling');
const { randomUUID } = require('crypto');

// Track active sessions by guest ID to prevent duplicate connections
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
    // No-auth middleware: assign every connecting socket a guest identity
    io.use((socket, next) => {
        // Allow a client-provided guestId for reconnection, or generate a new one
        const providedId = socket.handshake.auth?.guestId;
        const guestId = providedId && typeof providedId === 'string' && providedId.length < 64
            ? providedId
            : randomUUID();

        socket.user = {
            id: guestId,
            role: 'guest',
        };
        next();
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
        console.log(`New connection: ${socket.id} guest:${socket.user.id} (Online: ${onlineCount})`);

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
