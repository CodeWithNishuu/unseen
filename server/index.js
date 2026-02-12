const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const path = require('path');

const app = express();
app.set('trust proxy', 1); // Required for Render behind proxy

// Serve static files from the React client - MOVED TO BOTTOM


const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    },
    pingTimeout: 60000,
    pingInterval: 25000
});

// State
let waitingUsers = []; // [{ socketId, name }]
const activeRooms = new Map(); // roomId -> { users: [socketId, socketId], startTime }
const userState = new Map(); // socketId -> { roomId, name, status, partnerId }

// Helpers
const findMatch = () => {
    // Loop until we can't make any more pairs
    while (waitingUsers.length >= 2) {
        const user1 = waitingUsers.shift();
        const user2 = waitingUsers.shift();

        const roomId = `room_${user1.socketId}_${user2.socketId}`;

        // Update States
        userState.set(user1.socketId, { roomId, name: user1.name, status: 'chatting', partnerId: user2.socketId });
        userState.set(user2.socketId, { roomId, name: user2.name, status: 'chatting', partnerId: user1.socketId });

        activeRooms.set(roomId, { users: [user1.socketId, user2.socketId], startTime: Date.now() });

        // Join Rooms
        const socket1 = io.sockets.sockets.get(user1.socketId);
        const socket2 = io.sockets.sockets.get(user2.socketId);

        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        // Notify Users
        io.to(user1.socketId).emit('match_found', { partnerName: 'Stranger', initiator: true });
        io.to(user2.socketId).emit('match_found', { partnerName: 'Stranger', initiator: false });

        console.log(`MATCH MADE: ${user1.name} <-> ${user2.name} (${roomId})`);
    }

    if (waitingUsers.length === 1) {
        console.log(`WAITING: ${waitingUsers[0].name} is waiting for a match...`);
    }
};

const addToQueue = (socket, name) => {
    // Remove if already in queue
    waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);

    waitingUsers.push({ socketId: socket.id, name });
    console.log(`${name} added to queue. Queue length: ${waitingUsers.length}`);

    findMatch();
};

const handleDisconnect = (socketId) => {
    const state = userState.get(socketId);

    // Remove from queue if waiting
    waitingUsers = waitingUsers.filter(u => u.socketId !== socketId);

    if (state && state.roomId) {
        const roomId = state.roomId;
        const room = activeRooms.get(roomId);

        if (room) {
            // Notify partner
            const partnerId = room.users.find(id => id !== socketId);
            if (partnerId) {
                io.to(partnerId).emit('partner_disconnected');

                // Cleanup partner state
                const partnerState = userState.get(partnerId);
                if (partnerState) {
                    partnerState.roomId = null;
                    partnerState.status = 'idle';
                    partnerState.partnerId = null;
                    userState.set(partnerId, partnerState);
                }
            }
            activeRooms.delete(roomId);
        }
    }

    userState.delete(socketId);
    console.log(`User ${socketId} disconnected/left.`);
};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join_queue', ({ name }) => {
        addToQueue(socket, name);
    });

    socket.on('send_message', ({ text, timestamp }) => {
        const state = userState.get(socket.id);
        if (state && state.roomId) {
            socket.to(state.roomId).emit('message', {
                text,
                sender: 'stranger',
                timestamp
            });
        }
    });

    socket.on('next_partner', () => {
        const state = userState.get(socket.id);
        const name = state ? state.name : 'Anonymous';

        handleDisconnect(socket.id); // Leave current
        addToQueue(socket, name); // Re-join
    });

    socket.on('leave_chat', () => {
        handleDisconnect(socket.id);
    });

    socket.on('disconnect', () => {
        handleDisconnect(socket.id);
    });
});

// Handle React routing, return all requests to React app
app.use(express.static(path.resolve(__dirname, "../client/dist")));

app.get(/^(.*)$/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../client/dist/index.html"));
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`SERVER RUNNING ON PORT ${PORT}`);
});
