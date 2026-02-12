# Unseen - Project Analysis & Technical Overview

## 1. Technology Stack

### Frontend (Client)
- **Framework**: React 19 (via Vite)
- **Styling**: Tailwind CSS v4 (Utility-first, responsive, dark theme)
- **Real-time Client**: `socket.io-client` v4
- **Icons**: Lucide React
- **Build Tool**: Vite (Fast HMR and optimized production builds)

### Backend (Server)
- **Runtime**: Node.js
- **Framework**: Express.js (HTTP server handling static assets and API routes)
- **Real-time Engine**: Socket.IO v4 (WebSocket abstraction layer)
- **CORS**: `cors` middleware for security
- **Environment**: `dotenv` for configuration

---

## 2. Architecture Pattern

**Monolithic Client-Server Architecture (Stateful)**

- **Monolithic**: The backend serves the frontend static files. Both live in the same repository and run on the same port in production.
- **Stateful**: The server maintains the state of active users and rooms in memory (RAM). It is *not* stateless.
- **Event-Driven**: The core communication is not Request-Response (HTTP), but Bi-directional Events (WebSockets).

**Data Flow**:
1.  Client loads React App (HTTP).
2.  Client establishes persistent WebSocket connection (WS).
3.  Events (`join_queue`, `match_found`, `message`) flow instantly between Client and Server.

---

## 3. End-to-End User Flow

1.  **Landing**: User arrives, enters a display name (e.g., "Alex").
2.  **Connection**:
    -   Click "Connect".
    -   Socket connects to server (`transports: ['websocket']`).
    -   Client emits `join_queue`.
3.  **Matchmaking**:
    -   Server adds user to `waitingUsers` array.
    -   Server checks if queue length ≥ 2.
    -   If yes, pairs the top 2 users into a unique `roomId`.
4.  **Chat Session**:
    -   Both users receive `match_found` event.
    -   UI switches to Chat View.
    -   Messages are sent via `send_message` event to the `roomId`.
5.  **Termination**:
    -   User clicks "Next" or closes tab.
    -   Socket disconnects or emits `next_partner`.
    -   Server notifies partner (`partner_disconnected`).
    -   User re-enters queue (if "Next" clicked).

---

## 4. Core Features

-   **Anonymous Identity**: No login, no passwords. Identity is ephemeral (Name + Socket ID).
-   **Real-time Matchmaking**: Instant pairing logic using a First-In-First-Out (FIFO) queue.
-   **Private Rooms**: Users are isolated in Socket.IO "rooms". Message A only goes to Partner A.
-   **Production Resilience**:
    -   Connection recovery (Pulse/Heartbeat).
    -   Queue draining (Loop logic handles high traffic).
    -   Proxy trust (works behind Nginx/Load Balancers).
-   **Responsive UI**: Mobile-first design adapting to phones, tablets, and desktops.

---

## 5. Matchmaking Logic (The "Brain")

The matchmaking is **In-Memory Queue-Based**.

**Algorithm**:
1.  **Global Queue**: A simple JavaScript Array `waitingUsers = []`.
2.  **Join**: `waitingUsers.push(user)`.
3.  **Process**:
    -   Triggered on every Join or Disconnect.
    -   `while (waitingUsers.length >= 2)` loop runs.
    -   **Pop**: `user1 = shift()`, `user2 = shift()`.
    -   **Room**: `roomId = user1.id + user2.id`.
    -   **Pair**: `socket.join(roomId)`.
    -   **Notify**: Emit `match_found` to both.

**Why it works**: It's O(1) for finding a match (just take the next one). It ensures no one waits if a partner is available.

---

## 6. Design Philosophy: Why No User List?

**By Design: "Serendipity & Privacy"**

-   **Privacy**: A user list would require exposing who is online. "Unseen" promises anonymity.
-   **Simplicity**: Selecting a user adds friction/social anxiety ("Will they accept?"). Random pairing removes rejection fear.
-   **Scalability**: Broadcasting a user list to 10,000 users requires O(N²) message complexity (everyone needs updates about everyone). Random pairing is O(1).

---

## 7. System Behavior Scenarios

### Scenario A: 1 User Online
-   User joins -> Added to Queue.
-   Queue Length = 1.
-   Match Loop checks `>= 2`? No.
-   **Result**: User waits on "Searching..." screen.

### Scenario B: 2 Users Online
-   User A joins -> Queue [A].
-   User B joins -> Queue [A, B].
-   Match Loop checks `>= 2`? Yes.
-   Pairs A & B. Queue [].
-   **Result**: Instant chat.

### Scenario C: 100+ Users (High Load)
-   10 users join simultaneously. Queue length = 10.
-   The `while` loop runs 5 times instantly.
-   5 pairs created. Queue = 0.
-   **Result**: Extremely high throughput. No bottlenecks.

---

## 8. Scalability (In-Memory Limits)

**Current Architecture (Single Node)**:
-   **Pros**: extremely fast (RAM logic), simple code, zero database latency.
-   **Cons**:
    -   **Restart Data Loss**: If server restarts, all active chats disconnect.
    -   **Single Core**: Node.js is single-threaded. CPU intensive tasks could block chatting. (Chat is I/O bound, so this is rarely an issue).
    -   **Memory Limit**: Max ~1.4GB RAM. Can handle ~10k-50k concurrent sockets depending on message size.

**Scaling Up (Future)**:
To scale beyond one server, you would need Redis Adapter for Socket.IO to share events across multiple server instances.

---

## 9. Deployment Recommendations

**Best Free Tier Platform: Render.com**

-   **Why**:
    -   Supports Node.js Natively.
    -   Allows WebSockets (many serverless platforms like Vercel Functions kill WebSockets).
    -   Free tier provides HTTPS/SSL automatically.
    -   "Web Service" type is perfect for long-running processes (unlike AWS Lambda).

**Alternatives**:
-   **Railway.app**: Excellent, but trial credit expires.
-   **Fly.io**: Good for low latency (edge), but configuration is complex.
-   **Vercel/Netlify**: **NOT RECOMMENDED** for the backend. They are serverless and will kill the WebSocket connection after 10 seconds. You can host Frontend there, but Backend must be on Render/Railway.

---

## 10. Testing Strategy

**Functional Testing**:
1.  **Browser Tabs**: Incognito vs Normal.
2.  **Cross-Device**: Phone on 4G vs Laptop on WiFi (using Ngrok tunnel).
3.  **Network Throttle**: Chrome DevTools -> Network -> Slow 3G (Test reconnection).

**Stress Testing**:
-   Use `artillery.io` with `socket.io` plugin to simulate 500 users joining at once to verify queue logic doesn't crash.
