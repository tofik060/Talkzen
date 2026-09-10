# Talkzen (Backend)

API and real-time server for **Talkzen** — auth, contacts, messages, and Socket.IO.

Built with **Express**, **MongoDB (Mongoose)**, **JWT**, **bcrypt**, and **Socket.IO**.

---

## Features

### Auth
- User registration (name, email, phone, location, password, optional image path)
- Password hashing with bcrypt (password + confirm password)
- Login returns JWT + safe user payload
- `GET /api/me` for the current user
- `PUT /api/me` to update profile
- `POST /api/change-password` (validates current password; rejects same new password)
- Auth middleware protects private routes
- Socket.IO handshake requires a valid JWT

### Contacts
- List users with relationship status (`none`, `pending`, `accepted`, `unfollowed`, `unfollowed_by_peer`)
- Send / accept / reject contact requests
- One-sided unfollow via `unfollowedBy[]`
- Chats list: peers you have not left; messaging only when status is `accepted`

### Messages
- Persist 1:1 messages with `senderId`, `receiverId`, `name`, `message`, `read`, `timestamp`
- Load a conversation with `userId` + `peerId`
- Mark messages as read
- Reject sends unless the pair is an accepted contact

### Real-time
- Socket.IO with JWT auth
- Broadcast chat events to other connected clients
- Presence helpers (`new-user-joined`, `users-list`, `leave`)

### Uploads
- Multer for optional image uploads
- Static `/uploads` folder (auto-created)

---

## Project structure

```
backend/
  .env / .env.example
  src/
    index.js              HTTP + Socket.IO server & routes
    db/conn.js            MongoDB connection
    middleware/auth.js    JWT verification
    models/
      users.js
      message.js
      contact.js
    uploads/              Ignored by git (user media)
```

---

## Prerequisites

- Node.js (LTS)
- MongoDB running (local or remote URI)

---

## Setup

```bash
cd backend
npm install
cp .env.example .env   # then edit secrets/URLs if needed
npm run dev
```

Server default: [http://localhost:3000](http://localhost:3000).

---

## Environment

```env
PORT=3000
DB_URI=mongodb://127.0.0.1:27017/chat_application
JWT_SECRET=change_me
JWT_EXPIRES_IN=24h
frontEnd_URL=http://localhost:4200
Backend_URL=http://localhost:3000/api
socket_URI=http://localhost:3000
```

- `frontEnd_URL` — CORS / Socket.IO origin  
- `Backend_URL` / `socket_URI` — documented API & socket base URLs  
- Keep `.env` out of git (see `.gitignore`)

---

## Main API routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/user-register` | No | Register |
| GET | `/api/user-register` | Yes | List users |
| GET | `/api/user-register/:id` | Yes | Get user by id |
| POST | `/api/login` | No | Login → JWT |
| GET | `/api/me` | Yes | Current user |
| PUT | `/api/me` | Yes | Update profile |
| POST | `/api/change-password` | Yes | Change password |
| GET | `/api/contacts` | Yes | Users + contact status |
| GET | `/api/chats` | Yes | Chat peers + unread/last message |
| POST | `/api/contacts/request` | Yes | Send request |
| POST | `/api/contacts/accept` | Yes | Accept request |
| POST | `/api/contacts/reject` | Yes | Reject / cancel |
| POST | `/api/contacts/unfollow` | Yes | One-sided unfollow |
| GET | `/api/message` | Yes | Conversation (`userId`, `peerId`) |
| POST | `/api/message` | Yes | Save message |
| POST | `/api/message/read` | Yes | Mark peer messages read |

---

## Contact / unfollow rules

- **Accepted** → both can chat  
- **A unfollows B** → A leaves the chat list; B still sees history but cannot send  
- **Request again** after unfollow resets the link to `pending`  
- Messaging is allowed only while status is `accepted`

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with nodemon (`src/index.js`) |

---

## Tech stack

- Express
- Mongoose / MongoDB
- jsonwebtoken + bcrypt
- Socket.IO
- multer
- dotenv
- cors
