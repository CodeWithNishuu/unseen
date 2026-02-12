# Unseen - Monolithic Deployment Guide (Render Only)

This guide allows you to deploy **BOTH** the Frontend and Backend as a **SINGLE** Web Service on Render.

## Why this is better?
- **Cheaper**: Only 1 service to manage.
- **Simpler**: No CORS issues. No separate builds.
- **Fast**: Frontend and Backend on the same server.

## 1. Prepare for Deployment

1.  **Git Push**: Ensure your entire `unseen` folder (containing both `client` and `server`) is pushed to a GitHub repository.

## 2. Configure Render

1.  Go to [Render Dashboard](https://dashboard.render.com/) and create a **New Web Service**.
2.  Connect your GitHub repository.
3.  **Settings**:
    *   **Name**: `unseen-app`
    *   **Root Directory**: (Leave empty, use the project root)
    *   **Environment**: `Node`
    *   **Region**: Closest to you
    *   **Branch**: `main` (or master)
    *   **Build Command**:
        ```bash
        cd client && npm install && npm run build && cd ../server && npm install
        ```
        *(This builds the React app first, then installs backend dependencies)*
    *   **Start Command**:
        ```bash
        node server/index.js
        ```
    *   **Plan**: Free

4.  **Environment Variables**:
    *   Key: `PORT` -> Value: `3001` (Render usually sets this, but safe to add)
    *   **Note**: You do NOT need `CORS_ORIGIN` or `VITE_SERVER_URL` anymore because they are on the same domain!

5.  **Click Create Web Service**.

## 3. Done!

Render will build your frontend, start your backend, and serve the app.
Your URL will be something like `https://unseen-app.onrender.com`.

Open it and chat!
