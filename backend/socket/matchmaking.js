const queue = [];

const handleMatchmaking = (io, socket, applyRateLimit) => {
    applyRateLimit('joinQueue', (userData) => {
        socket.userData = userData; 
        
        // Clean up self or stale entries from the queue before moving forward
        const validQueueIndex = queue.findIndex(q => q.socketId !== socket.id && io.sockets.sockets.get(q.socketId));

        if (validQueueIndex !== -1) {
            const partner = queue.splice(validQueueIndex, 1)[0];
            const partnerSocket = io.sockets.sockets.get(partner.socketId);

            if (partnerSocket) {
                const sessionId = Math.random().toString(36).substring(7);
                
                socket.emit('matched', { partner: partner.userData, sessionId, initiator: true });
                partnerSocket.emit('matched', { partner: userData, sessionId, initiator: false });

                socket.partnerId = partner.socketId;
                partnerSocket.partnerId = socket.id;
                
                console.log(`Matched ${socket.id} with ${partner.socketId}`);
            } else {
                // Partner disappeared during the split second it took to retrieve them
                queue.push({ socketId: socket.id, userData });
            }
        } else {
            // Remove any old iterations of myself from the queue
            const myOldIndex = queue.findIndex(q => q.socketId === socket.id);
            if (myOldIndex !== -1) queue.splice(myOldIndex, 1);
            
            queue.push({ socketId: socket.id, userData });
            console.log(`User ${socket.id} joined queue`);
        }
        io.emit('queueCount', queue.length);
    });

    applyRateLimit('leaveQueue', () => {
        const index = queue.findIndex(item => item.socketId === socket.id);
        if (index !== -1) {
            queue.splice(index, 1);
            io.emit('queueCount', queue.length);
            console.log(`User ${socket.id} left queue`);
        }
    });

    socket.on('disconnect', () => {
        const index = queue.findIndex(item => item.socketId === socket.id);
        if (index !== -1) {
            queue.splice(index, 1);
            io.emit('queueCount', queue.length);
        }
        
        if (socket.partnerId) {
            const partnerSocket = io.sockets.sockets.get(socket.partnerId);
            if (partnerSocket) {
                partnerSocket.emit('partnerDisconnected');
                partnerSocket.partnerId = null;
            }
        }
    });
};

module.exports = { handleMatchmaking };
