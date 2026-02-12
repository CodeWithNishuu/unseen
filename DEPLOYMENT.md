# Unseen - Deployment Guide

This guide details the exact steps to deploy "Unseen" to production using Render (Backend) and Vercel (Frontend).

## 1. Backend Deployment (Render)

**Goal**: Deploy the `server` directory as a Node.js Web Service.

1.  **Push Code**: Push your `unseen` repository to GitHub/GitLab.
2.  **Create Service**: Go to [Render Dashboard](https://dashboard.render.com/) > New > Web Service.
3.  **Connect Repo**: Select your `unseen` repository.
4.  **Configure Service**:
    *   **Name**: `unseen-backend`
    *   **Root Directory**: `server` (Important!)
    *   **Environment**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `npm start`
    *   **Plan**: Free (or Starter for better performance)
5.  **Environment Variables**:
    *   Key: `PORT`
        *   Value: `3001` (Note: Render usually sets this automatically, but good to have)
    *   Key: `CORS_ORIGIN`
        *   Value: `*` (Initially to ensure connectivity. Once frontend is deployed, update this to your Vercel URL, e.g., `https://unseen.vercel.app`)

**Verification**:
Once deployed, Render will provide a URL (e.g., `https://unseen-backend.onrender.com`).
Visit it in your browser. You should see "Cannot GET /" (which is correct for a pure API/Socket server) or you can add a simple root route to `index.js` to say "Server Running".

## 2. Frontend Deployment (Vercel)

**Goal**: Deploy the `client` directory as a Static Site.

1.  **Create Project**: Go to [Vercel Dashboard](https://vercel.com/new).
2.  **Import Repo**: Select your `unseen` repository.
3.  **Configure Project**:
    *   **Framework Preset**: `Vite`
    *   **Root Directory**: `client` (Important! Click Edit to change from root to `client`)
4.  **Environment Variables**:
    *   Key: `VITE_SERVER_URL`
        *   Value: `https://unseen-backend.onrender.com` (The URL you got from Render)
5.  **Deploy**: Click Deploy.

## 3. Post-Deployment Verification

1.  **Open the live Vercel URL** on your computer.
2.  **Open the live Vercel URL** on your phone (disconnect via WiFi to test real internet pairing).
3.  **Test**:
    *   Enter "Desktop" on computer.
    *   Enter "Mobile" on phone.
    *   Click "Connect" on both.
    *   **Result**: You should match instantly.
4.  **Troubleshooting**:
    *   If you don't connect: Check the Browser Console (F12) for "Socket connection error".
    *   Ensure `VITE_SERVER_URL` does NOT have a trailing slash (e.g., use `https://b.com`, not `https://b.com/`).
