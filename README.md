# 💬 Realtime Chat App

Welcome to the Realtime Chat App — a clean, responsive, and secure chatting platform built from scratch using basic web technologies. This app lets users sign up, log in, and chat with others in real time — no extra tools or accounts required!

---

## 🌟 What This Project Does

- 🔐 **User Authentication** — Users can sign up and log in securely with their email and password. Passwords are hashed with bcrypt to keep them safe.
- ⚡ **Live Messaging** — Real-time chat using Socket.IO so messages appear instantly without needing to refresh.
- 💡 **Modern Design** — Clean UI with a dark/light theme, smooth animations, and responsive design for mobile and desktop.
- 🧠 **Simple Backend** — No need for a database! User data is saved in a local `users.json` file using Node.js.

---

## 🛠️ Tech Stack

**Frontend:**
- HTML, CSS, JavaScript

**Backend:**
- Node.js
- Express.js
- Socket.IO
- bcrypt
- JSON Web Tokens (JWT)

---

## 🚀 How to Run This App Locally

Just follow these simple steps to get the chat app running on your own machine:

1. **Clone this repository**
   ```bash
   git clone https://github.com/your-username/chat-app.git
   cd chat-app
2. **Install the required packages**
    ```bash
    npm install
3. **Start the server
    ```bash
    npm start
4. **Open your browser**
    ```
    Visit https://localhost:3000 to use the app.

---
  
## What You Can Try
  * Sign up with a new email and password.
  * Log in using your saved credentials.
  * Send messages in real time with others.

---

## Project Structure ##
    ```bash
    chat-app/
    |- public/          # Frontend Files(HTML, CSS, JS)
    |  |- index.html
    |  |- style.css
    |  |- script.js
    |- users.json       # Stores user credentials (hashed)
    |- server.js        # Backend logic and routing
    |- package.json     # Project dependencies
    |- README.md        # You're reading it!

---

## Screenshots ##

## Developer ##
Build with ❤️ by @navneetranjan07
If you enjoyed the project or found it helpful, feel free to star ⭐ the repo!
