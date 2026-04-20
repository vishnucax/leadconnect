const xss = require('xss');

const handleSignaling = (io, socket, applyRateLimit) => {
    applyRateLimit('offer', (data) => {
        if (socket.partnerId) {
            io.to(socket.partnerId).emit('offer', data);
        }
    });

    applyRateLimit('answer', (data) => {
        if (socket.partnerId) {
            io.to(socket.partnerId).emit('answer', data);
        }
    });

    applyRateLimit('ice-candidate', (data) => {
        if (socket.partnerId) {
            io.to(socket.partnerId).emit('ice-candidate', data);
        }
    });

    applyRateLimit('sendMessage', (message) => {
        if (socket.partnerId && typeof message === 'string') {
            const safeMessage = xss(message.trim());
            if (safeMessage.length > 0) {
                io.to(socket.partnerId).emit('receiveMessage', {
                    text: safeMessage,
                    sender: 'partner',
                    timestamp: new Date()
                });
            }
        }
    });

    applyRateLimit('skip', () => {
        if (socket.partnerId) {
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('sessionEnded', { reason: 'partner_skipped' });
                partnerSocket.partnerId = null;
            }
            socket.partnerId = null;
        }
    });

    applyRateLimit('endSession', () => {
        if (socket.partnerId) {
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('sessionEnded', { reason: 'partner_ended' });
                partnerSocket.partnerId = null;
            }
            socket.partnerId = null;
        }
    });
};

module.exports = { handleSignaling };
