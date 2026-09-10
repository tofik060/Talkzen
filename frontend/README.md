# Talkzen (Frontend)

Angular frontend for **Talkzen** — sign in, register, manage contacts, and chat in real time.

Built with **Angular 16**, **Angular Material**, **RxJS**, and **Socket.IO client**.

---

## Features

### Auth
- Sign in / sign up screens
- Registration with name, email, phone, location, password, and optional avatar
- Password rules: 8+ characters, letter, number, and symbol; confirm password must match
- JWT stored in `localStorage`; attached to HTTP requests via interceptor
- Auth guard on the chat route

### Contacts
- Contacts tab lists all other users
- Send, accept, decline, or cancel contact requests
- Red badge on Contacts for incoming pending requests
- Accepted users move into Chats

### Chats
- Chats tab shows connected users (and peers who unfollowed you, read-only)
- Search chats/contacts
- Conversation view with avatars (or initials), bubbles, and timestamps
- Date separators: **Today**, **Yesterday**, or a full date
- Unread badges on the Chats rail and on each chat row
- Live messages over Socket.IO; history loaded from the API
- Composer hidden if the peer unfollowed you

### Profile & settings
- Settings menu: View Profile, Change Password, Log Out
- Edit profile details and avatar
- Change password dialog (blocks using the same password again)
- Confirm dialog for unfollow

---

## Project structure

```
src/app/
  login/
  registration/
  chat-body/                 Main chat UI
  confirm-dialog/
  profile-dialog/
  change-password-dialog/
  services/chat-app.service.ts
  guards/auth.guard.ts
  interceptors/auth.interceptor.ts
  environments/
```

---

## Prerequisites

- Node.js (LTS)
- Angular CLI 16
- Running Talkzen backend (default `http://localhost:3000`)

---

## Setup

```bash
cd frontend
npm install
ng serve
```

Open [http://localhost:4200](http://localhost:4200).

---

## Environment

Configure URLs in `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  frontEnd_URL: 'http://localhost:4200',
  Backend_URL: 'http://localhost:3000/api',
  socket_URI: 'http://localhost:3000',
};
```

Production builds use `environment.prod.ts` (via `angular.json` file replacements).

---

## Routes

| Path | Screen | Access |
|------|--------|--------|
| `/` | Sign in | Public |
| `/registration` | Sign up | Public |
| `/chat-application` | Chat app | JWT required |

---

## Scripts

| Command | Description |
|---------|-------------|
| `ng serve` / `npm start` | Dev server |
| `ng build` | Production build → `dist/chat-application` |
| `ng test` | Unit tests |

---

## Tech stack

- Angular 16
- Angular Material
- Socket.IO client / ngx-socket-io
- RxJS
- Bootstrap (layout helpers)
