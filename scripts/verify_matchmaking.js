const { io } = require("socket.io-client");

const URL = "http://localhost:3001";
const CLIENT_COUNT = 2;
const clients = [];

console.log(`[TEST] Starting matchmaking verification with ${CLIENT_COUNT} clients...`);

// Helper to create a client
function createClient(name) {
    return new Promise((resolve, reject) => {
        const socket = io(URL, {
            transports: ["websocket"],
            reconnectionAttempts: 3
        });

        socket.on("connect", () => {
            console.log(`[CLIENT ${name}] Connected with ID: ${socket.id}`);
            socket.emit("join_queue", { name });
        });

        socket.on("match_found", (data) => {
            console.log(`[CLIENT ${name}] MATCH FOUND! Partner: ${data.partnerName}`);
            resolve(socket);
        });

        socket.on("connect_error", (err) => {
            console.error(`[CLIENT ${name}] Connection Error:`, err.message);
            reject(err);
        });
    });
}

async function runTest() {
    try {
        const p1 = createClient("Alice");
        const p2 = createClient("Bob");

        await Promise.all([p1, p2]);

        console.log("\n[SUCCESS] Both clients matched successfully!");
        process.exit(0);
    } catch (error) {
        console.error("\n[FAILURE] Test failed:", error);
        process.exit(1);
    }
}

runTest();
