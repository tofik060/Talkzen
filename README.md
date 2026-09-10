# Talkzen — Chat Application

**Talkzen** is a full-stack real-time chat app. Users create an account, connect with others through contact requests, and message privately once both sides are connected.

This repository has two parts:

| Folder | Role |
|--------|------|
| `frontend/` | Angular UI (sign in, register, contacts, chats) |
| `backend/` | Express API, MongoDB, JWT auth, Socket.IO |

See each folder’s `README.md` for setup details.

**Live demo**

| Service | URL |
|---------|-----|
| Web app | [https://talkzen-web.onrender.com](https://talkzen-web.onrender.com) |
| API | [https://talkzen-api.onrender.com](https://talkzen-api.onrender.com) |

> Free Render instances may sleep when idle; the first request after idle can take a short cold start.

---

## Purpose

Talkzen is built for simple **1:1 messaging** with a clear connection flow:

1. Discover people in **Contacts**
2. Send a request and wait for acceptance
3. Chat only with accepted contacts
4. Optionally **unfollow** / **delete chat** without wiping the other person’s history
5. Edit or permanently delete your own messages

It is meant as a practical chat product / learning project covering auth, REST APIs, WebSockets, and relationship rules (not open group rooms).

---

## How it works

### High-level flow

```
User → Frontend (Angular)
         │
         ├─ HTTP  → Backend REST API (/api/...)
         └─ Socket → Backend Socket.IO (live messages)
                        │
                        └─ MongoDB (users, contacts, messages)
```

### 1. Accounts
- New users register (profile + optional avatar, or initials if none)
- Login returns a **JWT**; the frontend stores it and sends it on API and socket requests
- Protected screens (chat) require a valid token
- **Forgot password:** enter email → set a new password with a short-lived reset token → sign in again
- **Delete account** permanently removes the user, chats, and contacts (from Account settings)

### 2. Contacts
- Contacts shows every other registered user
- Actions: **Add** → pending → **Accept / Decline**
- Until accepted, users do **not** appear in each other’s Chats for messaging

### 3. Chats & messaging
- Chats lists accepted contacts (plus special unfollow cases below)
- Opening a chat loads saved messages from the database
- Sending a message:
  1. Saves via `POST /api/message`
  2. Emits over Socket.IO so the peer sees it live
- Unread counts update when messages arrive for a chat you are not viewing
- Threads show **Today / Yesterday / date** separators
- Click your own bubble for a menu:
  - **Edit** — update text (shows an *Edited* label; syncs live)
  - **Delete permanently** — removes the message for everyone
- Chat header **⋮** menu:
  - **Search** within the conversation
  - **Close chat**
  - **Clear chat** — clears history **for you only** (peer keeps messages)
  - **Delete chat** — removes the contact from your list (unfollow)

### 4. Unfollow (one-sided)
- If **A** unfollows **B**:
  - **A** removes **B** from their chat list
  - **B** still sees past messages with **A**
  - **B** cannot send new messages to **A**
- Either user can **Request again** from Contacts to reconnect

### 5. Profile & settings
- Settings: **View Profile**, **Account** (change password / delete account), **Log Out** (with confirmation)
- Password change requires the current password and a different new one
- Logged-out users can also reset via **Forgot password?** on the sign-in screen

### 6. Mobile
- Bottom nav: Chats, Contacts, profile, Settings
- Single-pane flow: list → full-screen conversation with back

---

## Quick start

**Backend**

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

**Frontend**

```bash
cd frontend
npm install
ng serve
```

Then open [http://localhost:4200](http://localhost:4200) (API default: [http://localhost:3000](http://localhost:3000)).

---

## Stack

- **Frontend:** Angular 16, Angular Material, Socket.IO client  
- **Backend:** Node.js, Express, Mongoose, JWT, bcrypt, Socket.IO  
- **Database:** MongoDB  
- **Hosting:** Render (Static Site + Web Service) + MongoDB Atlas  

---

## Docs

- [Frontend README](./frontend/README.md) — UI setup, routes, env  
- [Backend README](./backend/README.md) — API routes, env, contact rules  
- [Deploy on Render](./DEPLOY.md) — host frontend + backend on Render + MongoDB Atlas  
