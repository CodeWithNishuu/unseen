const { io } = require("../client/node_modules/socket.io-client");

// Configuration
const URL = process.env.SERVER_URL || "http://localhost:3001";
const CLIENT_COUNT = 10;
const RAMP_UP_DELAY = 100; // ms between connections

console.log(`Starting Load Test against: ${URL}`);
console.log(`Simulating ${CLIENT_COUNT} users...`);

const clients = [];
let matches = 0;
let errors = 0;

const createClient = (index) => {
    const socket = io(URL, {
        transports: ['websocket'],
        reconnectionAttempts: 3,
        forceNew: true
    });

    const name = `User_${index}`;

    socket.on('connect', () => {
        // console.log(`${name} connected: ${socket.id}`);
        socket.emit('join_queue', { name });
    });

    socket.on('match_found', (data) => {
        console.log(`[MATCH] ${name} matched with ${data.partnerName} (${data.initiator ? 'Initiator' : 'Peer'})`);
        matches++;

        // Simulate behavior: 
        // 50% chance to disconnect after 2 seconds
        // 50% chance to request next partner after 3 seconds
        setTimeout(() => {
            if (Math.random() > 0.5) {
                // console.log(`${name} clicking NEXT`);
                socket.emit('next_partner');
            } else {
                // console.log(`${name} disconnecting`);
                socket.disconnect();
            }
        }, 2000 + Math.random() * 2000);
    });

    socket.on('partner_disconnected', () => {
        // console.log(`[INF] ${name}'s partner disconnected. Requeuing...`);
        setTimeout(() => {
            if (socket.connected) socket.emit('next_partner');
        }, 500);
    });

    socket.on('connect_error', (err) => {
        console.error(`${name} connection error:`, err.message);
        errors++;
    });

    clients.push(socket);
};

// Ramp up clients
for (let i = 0; i < CLIENT_COUNT; i++) {
    setTimeout(() => createClient(i), i * RAMP_UP_DELAY);
}

// Summary after 10 seconds
setTimeout(() => {
    console.log("\n--- LOAD TEST SUMMARY ---");
    console.log(`Total Clients: ${CLIENT_COUNT}`);
    console.log(`Total Matches Triggered: ${matches / 2} (approx pairs)`);
    console.log(`Errors: ${errors}`);

    // Verify cleanup
    console.log("Shutting down clients...");
    clients.forEach(c => c.disconnect());
    console.log("Done.");
}, 10000);
