# Unseen - Final Production Deployment Guide

This guide ensures your application "Unseen" runs successfully on **Render.com (Free Tier)** as a monolithic application.

## 1. Prerequisites (Do this now)

1.  **Git Push**: Ensure your latest code (with my fixes) is pushed to GitHub/GitLab.
    ```bash
    git add .
    git commit -m "Final production ready build"
    git push origin main
    ```

## 2. Create Web Service on Render

1.  Go to [Render Dashboard](https://dashboard.render.com/).
2.  Click **New +** -> **Web Service**.
3.  Connect your repository `unseen`.

## 3. Configuration (Copy Exactly)

| Setting | Value | Explanation |
| :--- | :--- | :--- |
| **Name** | `unseen-chat` (or similar) | Project name |
| **Region** | `Oregon` or `Frankfurt` | Choose closest to you |
| **Branch** | `main` | Your default branch |
| **Root Directory** | `.` | Leave empty (defaults to root) |
| **Runtime** | `Node` | |
| **Build Command** | `cd client && npm install && npm run build && cd ../server && npm install` | Builds frontend, installs backend deps |
| **Start Command** | `node server/index.js` | Starts the Express server |
| **Instance Type** | **Free** | |

## 4. Environment Variables (Critical)

You MUST add these in the "Environment" tab:

| Key | Value | Reason |
| :--- | :--- | :--- |
| `NODE_VERSION` | `20` | Ensures generic Node compatibility (v20+ recommended) |
| `CORS_ORIGIN` | `https://your-app-name.onrender.com` | **Update this** after you get the URL. Or use `*` temporarily. |

## 5. Deploy & Verify

1.  Click **Create Web Service**.
2.  Wait for the logs. You should see:
    -   `vite build` output...
    -   `SERVER RUNNING ON PORT 10000` (Render sets port automatically).
3.  **Open the URL** (e.g., `https://unseen-chat.onrender.com`).

### Verification Steps (Once live)
1.  **Normal Tab**: Open URL. Note "Searching...".
2.  **Incognito Tab**: Open URL.
3.  **Success**: Both should instantly connect ("Connected to a stranger").

## 6. Zero-Downtime / Architecture Note
Since this is the **Free Tier**:
-   The server will **spin down** after inactivity (15 mins).
-   First request will take ~50 seconds (Cold Start).
-   Use a free monitoring service (like UptimeRobot) to ping it every 10 mins if you want to keep it awake (optional).
