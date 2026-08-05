# Windows 98 Resume & Portfolio - Setup & Cloudflare Guide

This document provides step-by-step instructions on how to test the application locally and how to deploy or import it to Cloudflare.

---

## 🛠️ Prerequisites

Before getting started, make sure you have the following installed on your machine:
- **Node.js**: Version 18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **npm**: Included with Node.js
- **Cloudflare Account**: Optional for local testing, required for deployment ([Sign up for Cloudflare](https://dash.cloudflare.com/sign-up))

---

## 💻 1. How to Run & Test Locally

You can run and test the Windows 98 Resume application on your local machine using [Wrangler](https://developers.cloudflare.com/workers/wrangler/) (Cloudflare's CLI tool).

### Step 1: Install Dependencies
Open your terminal or PowerShell in the project root directory (`resume_update_win_98`) and run:

```bash
npm install
```

### Step 2: Start the Local Development Server
Run the local dev command:

```bash
npm run dev
```
*(Alternatively, you can run `npx wrangler dev`)*

### Step 3: Open in Browser
Once the dev server starts, Wrangler will output a local URL (typically `http://localhost:8787` or `http://127.0.0.1:8787`).
Open that URL in your browser to interact with your Windows 98 Resume.

> [!TIP]
> Changes made to files in `public/` or `src/` will automatically refresh or update in local preview mode.

---

## ☁️ 2. How to Deploy or Import to Cloudflare

There are two primary methods to deploy your application to Cloudflare Workers: **Command Line Interface (CLI)** or **Git Repository Integration (Cloudflare Dashboard)**.

---

### Method A: Deploying via CLI (Recommended & Fastest)

#### Step 1: Authenticate Wrangler with Cloudflare
If you haven't logged in to Cloudflare CLI on your machine yet, run:

```bash
npx wrangler login
```
This will open your web browser requesting permission to authorize Wrangler with your Cloudflare account. Click **Allow**.

#### Step 2: Deploy to Cloudflare
Run the deployment command:

```bash
npm run deploy
```
*(Alternatively, run `npx wrangler deploy`)*

#### Step 3: Access your Live Website
Once deployment finishes, Wrangler will output your live Workers URL (e.g., `https://win98-resume.<your-subdomain>.workers.dev`).

---

### Method B: Importing via Git & Cloudflare Dashboard

If you store your project in a Git repository (GitHub or GitLab), Cloudflare can automatically build and deploy your app every time you push code.

#### Step 1: Push Code to GitHub / GitLab
Create a repository on GitHub/GitLab and push your project:
```bash
git init
git add .
git commit -m "Initial Windows 98 Resume commit"
git remote add origin https://github.com/YOUR_USERNAME/win98-resume.git
git branch -M main
git push -u origin main
```

#### Step 2: Connect Repository in Cloudflare Dashboard
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** in the left sidebar menu.
3. Click **Create Application**.
4. Select the **Pages** tab and click **Connect to Git**.
5. Select your repository (`win98-resume`).
6. Set the build configuration:
   - **Framework preset**: `None` (or `None / Custom`)
   - **Build output directory**: `public`
7. Click **Save and Deploy**. Cloudflare will build and host your app on an edge URL.

---

## 📁 Project Configuration Summary

- `wrangler.json`: Configuration file specifying worker entrypoint (`src/index.js`) and static assets binding (`./public`).
- `public/`: Directory containing static UI assets (`index.html`, `css/style.css`, `js/app.js`).
- `src/index.js`: Cloudflare Worker fetch handler serving static assets.
