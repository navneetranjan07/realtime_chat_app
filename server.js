const express   = require('express');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const http      = require('http');
const { join }  = require('path');
const fs        = require('fs');
const multer    = require('multer');
const socketIO  = require('socket.io');

const app    = express();
const server = http.createServer(app);
const io     = socketIO(server);

const JWT_SECRET  = '🔒_replace_this_with_a_long_random_secret_key_🔒';
const USERS_FILE  = join(__dirname, 'users.json');
const CHAT_FILE   = join(__dirname, 'chat.json');
const UPLOAD_DIR  = join(__dirname, 'uploads');

if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR);

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

function readUsers () {
  if (!fs.existsSync(USERS_FILE)) fs.writeFileSync(USERS_FILE, '[]');
  return JSON.parse(fs.readFileSync(USERS_FILE));
}
function writeUsers (users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function readChatHistory() {
  if (!fs.existsSync(CHAT_FILE)) fs.writeFileSync(CHAT_FILE, '[]');
  return JSON.parse(fs.readFileSync(CHAT_FILE));
}
function writeChatHistory(messages) {
  fs.writeFileSync(CHAT_FILE, JSON.stringify(messages.slice(-50), null, 2));
}

app.use(express.static(join(__dirname, 'public')));
app.use('/uploads', express.static(UPLOAD_DIR));
app.use(express.json());

app.post('/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ success: false, message: 'Email & password required' });

  const users = readUsers();
  if (users.find(u => u.email === email))
    return res.status(400).json({ success: false, message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ email, passwordHash });
  writeUsers(users);

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, token });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const users = readUsers();
  const user  = users.find(u => u.email === email);
  if (!user) return res.status(401).json({ success: false, message: 'User not found' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ success: false, message: 'Invalid credentials' });

  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ success: true, token });
});

app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ success: false });
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl, name: req.file.originalname, type: req.file.mimetype });
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = payload;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', socket => {
  console.log(`✅ ${socket.user.email} connected`);

  const history = readChatHistory();
  history.forEach(msg => socket.emit('chat message', msg));

  socket.on('chat message', data => {
    const msgText = data.msg ? `${socket.user.email}: ${data.msg}` : `${socket.user.email} sent a file`;
    const message = {
      msg: msgText,
      fileUrl: data.fileUrl || null,
      fileName: data.fileName || null,
      fileType: data.fileType || null,
      timestamp: new Date().toISOString()
    };
    const history = readChatHistory();
    history.push(message);
    writeChatHistory(history);
    io.emit('chat message', message);
  });

  socket.on('typing', () => {
    socket.broadcast.emit('displayTyping', { email: socket.user.email });
  });

  socket.on('stopTyping', () => {
    socket.broadcast.emit('removeTyping');
  });

  socket.on('disconnect', () => {
    console.log(`❌ ${socket.user.email} disconnected`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
