const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { join } = require('path');
const fs = require('fs');
const socketIO = require('socket.io');
const multer = require('multer');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const JWT_SECRET = '🔒_replace_this_with_a_long_random_secret_key_🔒';
const USERS_FILE = join(__dirname, 'users.json');
const OTP_STORE = {};

app.use(cors());
app.use(express.static(join(__dirname, 'public')));
app.use(express.json());

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');

// Email setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'ridestatus07@gmail.com',        // Replace with your email
    pass: 'oein wrln vxfv angk'            // Use an App Password
  }
});

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// --- Helpers ---
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
function sendOTP(email, otp, purpose = 'Signup') {
  return transporter.sendMail({
    from: 'Realtime Chat App <your-email@gmail.com>',
    to: email,
    subject: `${purpose} OTP`,
    text: `Your OTP for ${purpose.toLowerCase()} is: ${otp}`
  });
}

// --- Auth Routes ---

// Request OTP for signup
app.post('/signup/request-otp', async (req, res) => {
  const { email, username } = req.body;
  const users = readUsers();
  if (users.find(u => u.email === email))
    return res.status(400).json({ success: false, message: 'User already exists' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  OTP_STORE[email] = { otp, username, timestamp: Date.now(), purpose: 'signup' };

  try {
    await sendOTP(email, otp, 'Signup');
    res.json({ success: true, message: 'OTP sent to your email' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Verify OTP and Signup
app.post('/signup/verify', async (req, res) => {
  const { email, password, username, otp } = req.body;
  const record = OTP_STORE[email];
  if (!record || record.otp !== otp || record.purpose !== 'signup')
    return res.status(400).json({ success: false, message: 'Invalid OTP' });

  const users = readUsers();
  if (users.find(u => u.email === email))
    return res.status(400).json({ success: false, message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ email, passwordHash, username });
  writeUsers(users);
  delete OTP_STORE[email];

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, token });
});

// Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ success: false, message: 'User not found' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, token });
});

// --- Password Reset ---

// Step 1: Request OTP
app.post('/reset-password/request', async (req, res) => {
  const { email } = req.body;
  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ success: false, message: 'User not found' });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  OTP_STORE[email] = { otp, timestamp: Date.now(), purpose: 'reset' };

  try {
    await sendOTP(email, otp, 'Reset Password');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// Step 2: Verify OTP & Change Password
app.post('/reset-password/verify', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const record = OTP_STORE[email];
  if (!record || record.otp !== otp || record.purpose !== 'reset') {
    return res.status(400).json({ success: false, message: 'Invalid OTP' });
  }

  const users = readUsers();
  const user = users.find(u => u.email === email);
  if (!user) return res.status(400).json({ success: false, message: 'User not found' });

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  writeUsers(users);
  delete OTP_STORE[email];

  res.json({ success: true, message: 'Password has been reset' });
});

// --- File Upload ---
app.post('/upload', upload.single('file'), (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const isImage = file.mimetype.startsWith('image/');
  res.json({
    success: true,
    fileData: {
      type: isImage ? 'image' : 'file',
      fileUrl: '/uploads/' + file.filename,
      originalName: file.originalname
    }
  });
});

// --- Socket.IO Auth ---
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    next();
  } catch {
    next(new Error('Authentication error'));
  }
});

// --- Realtime Chat ---
io.on('connection', socket => {
  const user = readUsers().find(u => u.email === socket.user.email);
  const username = user?.username || 'Anonymous';

  socket.on('chat message', data => {
    io.emit('chat message', {
      type: data.type || 'text',
      msg: data.msg || '',
      fileUrl: data.fileUrl || null,
      originalName: data.originalName || null,
      username
    });
  });

  socket.on('typing', ({ username }) => {
    socket.broadcast.emit('typing', { username });
  });

  socket.on('disconnect', () => {
    socket.broadcast.emit('typing', { username: null });
  });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
