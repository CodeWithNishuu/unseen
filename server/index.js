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
    pingTimeout: 60000,
    pingInterval: 25000
});

// State
let waitingUsers = []; // [{ socketId, name }]
const activeRooms = new Map(); // roomId -> { users: [socketId, socketId], startTime }
const userState = new Map(); // socketId -> { roomId, name, status, partnerId }

// AI State
const waitingTimers = new Map(); // socketId -> TimeoutID
const aiUsers = new Map(); // socketId -> { partnerName: 'Stranger', startTime: Date.now() }

const AI_RESPONSES = [
    "Tell me more about that.",
    "What happened next?",
    "How did that make you feel?",
    "That sounds interesting.",
    "I see what you mean.",
    "Go on...",
    "Why do you say that?"
];

// Helpers
// Helpers
const generateAIResponse = (text) => {
    const input = text.toLowerCase().trim();
    const words = input.split(' ');
    const phrase = words.slice(0, 5).join(' '); // Extract small phrase for reflection

    // 1. Detect Greetings
    const greetings = ['hi', 'hello', 'hey', 'namaste', 'yo'];
    if (greetings.some(g => input.startsWith(g) || input === g)) {
        const replies = [
            "Hey 🙂 how's your day going?",
            "Hello! Sab badhiya?",
            "Hey! What's up?",
            "Hi there, kaise ho?"
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // 2. Specific Questions
    if (input.includes('tum kya kar rahe ho') || input.includes('what are you doing')) {
        return "Bas yahin hu 🙂 tum batao?";
    }

    // 3. Emotional & Topical Keywords (Hinglish/Hindi/English)
    const emotions = {
        sad: ['sad', 'dukhi', 'ro raha', 'cry'],
        breakup: ['breakup', 'dhoka', 'kat gaya'],
        tired: ['tired', 'thak gaya', 'exhausted', 'thaka'],
        lonely: ['lonely', 'akela', 'alone'],
        angry: ['angry', 'gussa', 'irritated'],
        happy: ['happy', 'khush', 'mazze'],
        stressed: ['stressed', 'tension', 'life bekar', 'bad day'],
        study: ['padhai', 'exam', 'study', 'semester'],
        work: ['job', 'office', 'career', 'work'],
        relationship: ['relationship', 'pyaar', 'love', 'date']
    };

    if (emotions.breakup.some(w => input.includes(w))) {
        const replies = [
            `"${phrase}?" That must be hard… kitne time ka relationship tha?`,
            "Oh no, that's rough. Emotional stuff is the hardest. Handle kar paa rahe ho?",
            "Breakups are exhausting. Take your time to heal, dost."
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    if (emotions.sad.some(w => input.includes(w)) || emotions.lonely.some(w => input.includes(w))) {
        return "Hey, akela feel mat karo. Main hu na chat karne ke liye. Kya hua exactly?";
    }

    if (emotions.stressed.some(w => input.includes(w)) || emotions.tired.some(w => input.includes(w))) {
        return "Life is a bit much sometimes, isn't it? Relax karo thoda. Music sunoge?";
    }

    if (emotions.study.some(w => input.includes(w)) || emotions.work.some(w => input.includes(w))) {
        return "Pressure mat lo, sab ho jayega. Padhai/Work is important but peace of mind is more.";
    }

    // 4. Questions Detection
    if (input.includes('?')) {
        const replies = [
            "Hmm, let me think... honestly, I'm not sure. Aap batao?",
            "Good question. Wese aapke dimag mein kya chal raha hai?",
            "That's a tricky one! Haha."
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // 5. Short Replies (<= 3 words)
    if (words.length <= 3) {
        const shortReplies = [
            "Hmm, aur batao?",
            "I see. Wese aaj ka din kaisa raha?",
            "Sahiba baat hai.",
            "Interesting... tell me more."
        ];
        return shortReplies[Math.floor(Math.random() * shortReplies.length)];
    }

    // 6. Long messages (> 30 chars) - Follow up/Reflection
    if (input.length > 30) {
        const replies = [
            `"${phrase}..." yields a lot to think about. How did that make you feel?`,
            "I get what you mean. It's complicated, right?",
            "Thanks for sharing that. I'm listening, go on."
        ];
        return replies[Math.floor(Math.random() * replies.length)];
    }

    // Fallback
    const fallbacks = [
        "Sahi hai. Aur kya chal raha hai life mein?",
        "Hmm, I'm listening. Kuch aur batao?",
        "That's one way to look at it!",
        "Chalo, interesting hai."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
};

const clearAiTimer = (socketId) => {
    if (waitingTimers.has(socketId)) {
        clearTimeout(waitingTimers.get(socketId));
        waitingTimers.delete(socketId);
    }
};

const connectToAI = (socketId) => {
    // PATCH START: Race condition guards
    const socket = io.sockets.sockets.get(socketId);
    if (!socket) {
        clearAiTimer(socketId);
        return;
    }
    if (userState.has(socketId) && userState.get(socketId).roomId) {
        clearAiTimer(socketId);
        return;
    }
    // PATCH END

    // Only connect if user is still in waitingUsers
    const userIndex = waitingUsers.findIndex(u => u.socketId === socketId);
    if (userIndex === -1) return;

    // Remove from waiting queue
    const user = waitingUsers.splice(userIndex, 1)[0];
    clearAiTimer(socketId);

    // Set AI State
    const roomId = `room_ai_${socketId}`;
    aiUsers.set(socketId, { partnerName: 'Stranger', startTime: Date.now() });

    // Update User State
    userState.set(socketId, {
        roomId,
        name: user.name,
        status: 'chatting',
        partnerId: 'AI_COMPANION'
    });

    // Socket is verified above
    socket.join(roomId);
    socket.emit('match_found', { partnerName: 'Stranger', initiator: true });
    console.log(`AI MATCH: ${user.name} connected to AI Companion.`);
};

const startAiTimer = (socketId) => {
    clearAiTimer(socketId);
    const timer = setTimeout(() => {
        connectToAI(socketId);
    }, 10000); // 10 seconds
    waitingTimers.set(socketId, timer);
};

const findMatch = () => {
    // 1. Try to match waiting users first
    while (waitingUsers.length >= 2) {
        const user1 = waitingUsers.shift();
        const user2 = waitingUsers.shift();

        clearAiTimer(user1.socketId);
        clearAiTimer(user2.socketId);

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

    // 2. If 1 user waiting AND someone is with AI, interrupt AI to make a real match
    if (waitingUsers.length === 1 && aiUsers.size > 0) {
        const waitingUser = waitingUsers.shift();
        clearAiTimer(waitingUser.socketId);

        // Pick an AI user to interrupt
        // PATCH START: Deterministic Override (Oldest AI session first)
        let aiSocketId = null;
        let oldestTime = Infinity;

        for (const [id, data] of aiUsers.entries()) {
            if (data.startTime < oldestTime) {
                oldestTime = data.startTime;
                aiSocketId = id;
            }
        }

        if (!aiSocketId) return; // Should not happen given aiUsers.size > 0 check
        // PATCH END

        const aiUserEntry = aiUsers.get(aiSocketId);

        // Clean up AI state for the interrupted user
        aiUsers.delete(aiSocketId);
        const aiUserState = userState.get(aiSocketId);

        if (aiUserState) {
            const socketToInterrupt = io.sockets.sockets.get(aiSocketId);
            if (socketToInterrupt) {
                socketToInterrupt.leave(aiUserState.roomId);
            }
        }

        // Match waitingUser and aiSocketId
        const user1 = waitingUser;
        const user2 = {
            socketId: aiSocketId,
            name: aiUserState ? aiUserState.name : 'Anonymous'
        };

        const roomId = `room_${user1.socketId}_${user2.socketId}`;

        // Update States
        userState.set(user1.socketId, { roomId, name: user1.name, status: 'chatting', partnerId: user2.socketId });
        userState.set(user2.socketId, { roomId, name: user2.name, status: 'chatting', partnerId: user1.socketId });

        activeRooms.set(roomId, { users: [user1.socketId, user2.socketId], startTime: Date.now() });

        const socket1 = io.sockets.sockets.get(user1.socketId);
        const socket2 = io.sockets.sockets.get(user2.socketId);

        if (socket1) socket1.join(roomId);
        if (socket2) socket2.join(roomId);

        io.to(user1.socketId).emit('match_found', { partnerName: 'Stranger', initiator: true });
        io.to(user2.socketId).emit('match_found', { partnerName: 'Stranger', initiator: false });

        console.log(`MATCH MADE (AI INTERRUPTED): ${user1.name} <-> ${user2.name} (${roomId})`);
    }

    if (waitingUsers.length === 1) {
        console.log(`WAITING: ${waitingUsers[0].name} is waiting for a match...`);
    }
};

const addToQueue = (socket, name) => {
    // Remove if already in queue
    waitingUsers = waitingUsers.filter(u => u.socketId !== socket.id);

    // Also remove from AI if they happen to be there
    if (aiUsers.has(socket.id)) {
        aiUsers.delete(socket.id);
    }
    clearAiTimer(socket.id);

    waitingUsers.push({ socketId: socket.id, name });
    console.log(`${name} added to queue. Queue length: ${waitingUsers.length}`);

    // PATCH START: Timer Improvement (Search first, then wait)
    findMatch();

    // Only start timer if they weren't matched immediately
    if (waitingUsers.find(u => u.socketId === socket.id)) {
        startAiTimer(socket.id);
    }
    // PATCH END
};

const handleDisconnect = (socketId) => {
    const state = userState.get(socketId);

    // Remove from queue if waiting
    waitingUsers = waitingUsers.filter(u => u.socketId !== socketId);

    // Clean up AI Logic
    clearAiTimer(socketId);
    if (aiUsers.has(socketId)) {
        aiUsers.delete(socketId);
    }

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
            // Check if partner is AI
            if (state.partnerId === 'AI_COMPANION') {
                const responseText = generateAIResponse(text);

                // Realistic typing delay: 40ms/char, min 800ms, max 2500ms
                const typingTime = responseText.length * 40;
                const delay = Math.max(800, Math.min(2500, typingTime));

                setTimeout(() => {
                    const currentState = userState.get(socket.id);
                    if (currentState && currentState.partnerId === 'AI_COMPANION') {
                        socket.emit('message', {
                            text: responseText,
                            sender: 'stranger',
                            timestamp: Date.now()
                        });
                    }
                }, delay);
            } else {
                // Real user message
                socket.to(state.roomId).emit('message', {
                    text,
                    sender: 'stranger',
                    timestamp
                });
            }
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
