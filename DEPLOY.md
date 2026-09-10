# Deploy Talkzen on Render

Guide to host **frontend + backend** on [Render](https://render.com), with **MongoDB Atlas** for the database.

> Socket.IO works on a Render **Web Service**. On the **free** plan the backend sleeps after ~15 minutes idle (cold start on next request).

---

## What you will create

| Piece | Render type | Repo folder |
|-------|-------------|-------------|
| API + Socket.IO | **Web Service** | `backend` |
| Angular UI | **Static Site** | `frontend` |
| Database | **MongoDB Atlas** (external) | — |

Order: **Atlas → Backend → update frontend env → Frontend**.

---

## 0. Push code to GitHub

Commit and push this project to a GitHub repo (Render deploys from GitHub).

---

## 1. MongoDB Atlas (free)

1. Open [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free **M0** cluster.
2. **Database Access** → create a DB user (username + password).
3. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`) for Render.
4. **Connect** → **Drivers** → copy the connection string, e.g.

```text
mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/chat_application?retryWrites=true&w=majority
```

Replace `USER`, `PASSWORD`, and keep / add database name `chat_application`.

---

## 2. Deploy backend (Web Service)

1. Go to [https://dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**.
2. Connect your GitHub repo.
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `talkzen-api` (or any name) |
| **Root Directory** | `backend` |
| **Runtime** | Node |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance** | Free (or paid for always-on) |

4. **Environment** → add:

| Key | Value |
|-----|--------|
| `PORT` | `10000` (Render sets PORT automatically; optional) |
| `DB_URI` | your Atlas connection string |
| `JWT_SECRET` | a long random secret |
| `JWT_EXPIRES_IN` | `24h` |
| `frontEnd_URL` | `https://talkzen-web.onrender.com,http://localhost:4200` (comma-separated OK; must include your Static Site URL) |
| `Backend_URL` | `https://talkzen-api.onrender.com/api` (use your real service URL) |
| `socket_URI` | `https://talkzen-api.onrender.com` |

5. Click **Create Web Service** and wait until status is **Live**.
6. Copy the service URL, e.g. `https://talkzen-api.onrender.com`.

Test: open `https://YOUR-BACKEND.onrender.com/` — you should see `Invalid Endpoint` (that means the server is up).

---

## 3. Point frontend at the backend

Edit `frontend/src/environments/environment.prod.ts`:

```ts
export const environment = {
  production: true,
  frontEnd_URL: 'https://YOUR-FRONTEND.onrender.com', // set after step 4, or update + redeploy
  Backend_URL: 'https://talkzen-api.onrender.com/api',
  socket_URI: 'https://talkzen-api.onrender.com',
};
```

Commit and push this change.

---

## 4. Deploy frontend (Static Site)

1. Render → **New** → **Static Site**.
2. Same GitHub repo.

| Field | Value |
|-------|--------|
| **Name** | `talkzen-web` |
| **Root Directory** | `frontend` |
| **Build Command** | `npm install --include=dev --legacy-peer-deps && npx ng build --configuration production` |
| **Publish Directory** | `dist/chat-application` |

3. Create the static site and wait for the build.
4. Copy the frontend URL, e.g. `https://talkzen-web.onrender.com`.

### Fix Angular routes (refresh / deep links)

The app uses **hash routing** (`/#/chat-application`), so refresh works on Render without extra rewrite rules.

Optional (path URLs without `#`): Render → **talkzen-web** → **Redirects/Rewrites** → Source `/*` → Destination `/index.html` → Action **Rewrite**.

---

## 5. Connect frontend ↔ backend (CORS)

1. Backend service → **Environment** → set:

```text
frontEnd_URL=https://talkzen-web.onrender.com,http://localhost:4200
```

2. Update `environment.prod.ts` `frontEnd_URL` to the same URL if you have not already, then **push** and let the Static Site auto-redeploy (or Manual Deploy).

3. Backend → **Manual Deploy** → **Deploy latest commit** (so it reloads env).

---

## 6. Smoke test

1. Open the Static Site URL.
2. Register two users.
3. Send a contact request → accept → chat.
4. If the first request after idle is slow, the free backend was sleeping — wait and retry.

---

## Optional: `render.yaml` (Blueprint)

You can also use Render Blueprints later; manual setup above is enough for the first deploy.

---

## Common issues

| Problem | Fix |
|---------|-----|
| Frontend build fails (`ng` not found) | Use build command with `--include=dev` as above |
| API CORS errors | `frontEnd_URL` must include the Static Site URL exactly (`https://…`, no trailing slash). Comma-separate multiple origins if needed. |
| DB connection failed | Check Atlas user/password, Network Access `0.0.0.0/0`, and `DB_URI` |
| Socket not connecting | Confirm `socket_URI` is the backend URL (no `/api`) |
| Uploaded images disappear | Render disk is ephemeral; prefer avatar assets paths |
| Refresh on `/chat-application` shows Not Found | App uses hash routes (`/#/chat-application`). Redeploy frontend after that change, or add Rewrite `/*` → `/index.html` |

---

## Local vs production URLs

| | Local | Render |
|--|--------|--------|
| Frontend | `http://localhost:4200` | `https://….onrender.com` |
| API | `http://localhost:3000/api` | `https://….onrender.com/api` |
| Socket | `http://localhost:3000` | `https://….onrender.com` |

Dev still uses `environment.ts`. Production builds use `environment.prod.ts`.
