# Unseen - Anonymous Chat (Final Monolithic Deployment)

This repository contains the complete "Unseen" application, configured as a **Monolith** for easy 1-click deployment on Render.

## How it works

- **Frontend**: React/Vite (in `/client`).
- **Backend**: Node/Express + Socket.io (in `/server`).
- **Deployment**: The Express backend serves the built React frontend.

## 🚀 Deployment Instructions (Render)

1.  **Push to GitHub**: Commit and push this entire folder.
2.  **Create Web Service**: On Render, create a new Web Service connected to your repo.
3.  **Settings**:
    *   **Environment**: `Node`
    *   **Build Command**: `cd client && npm install && npm run build && cd ../server && npm install`
    *   **Start Command**: `node server/index.js`
    *   **Environment Variables**: None needed! (Render sets PORT automatically).

That's it. Your app will handle everything.

## 🧪 Local Testing

To test this "monolith" behavior locally:

1.  **Build Frontend**:
    ```bash
    cd client
    npm run build
    ```
2.  **Run Server**:
    ```bash
    cd ../server
    node index.js
    ```
3.  **Open**: `http://localhost:3001` (You are now accessing the backend serving the frontend!)

## 🛡️ Safety & Features
- **O(1) Matchmaking**: Instant pairing logic.
- **Auto-Requeue**: If a partner disconnects, you can instantly search again.
- **Anonymous**: No data persistence.
