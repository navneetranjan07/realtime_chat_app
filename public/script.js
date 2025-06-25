let socket;
let mode = 'login';

const authForm       = document.getElementById('auth-form');
const authContainer  = document.getElementById('auth-container');
const formTitle      = document.getElementById('form-title');
const toggleLink     = document.getElementById('toggle-link');
const toggleFormLine = document.getElementById('toggle-form');
const chatContainer  = document.querySelector('.chat-container');
const chatForm       = document.getElementById('form');
const input          = document.getElementById('input');
const fileInput      = document.getElementById('file-input');
const messages       = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const requestOtpBtn  = document.getElementById('request-otp-btn');

const emailField     = document.getElementById('email');
const passwordField  = document.getElementById('password');
const usernameField  = document.getElementById('username');
const otpField       = document.getElementById('otp');

// --- Toggle between login/signup ---
toggleLink.addEventListener('click', e => {
  e.preventDefault();
  mode = mode === 'login' ? 'signup' : 'login';

  formTitle.textContent = mode === 'login' ? 'Login to Chat' : 'Sign up to Chat';
  authForm.querySelector('button').textContent = mode === 'login' ? 'Login' : 'Verify OTP & Signup';
  toggleFormLine.innerHTML = mode === 'login'
    ? `Don’t have an account? <a href="#" id="toggle-link">Sign up</a>`
    : `Already have an account? <a href="#" id="toggle-link">Login</a>`;

  usernameField.style.display = mode === 'signup' ? 'block' : 'none';
  otpField.style.display      = mode === 'signup' ? 'block' : 'none';
  requestOtpBtn.style.display = mode === 'signup' ? 'block' : 'none';

  toggleFormLine.querySelector('a').addEventListener('click', toggleLink.onclick);
});

// --- Request OTP ---
requestOtpBtn.addEventListener('click', async () => {
  const email = emailField.value.trim();
  const username = usernameField.value.trim();

  if (!email || !username) return alert("Please enter email and username first.");

  const res = await fetch('/signup/request-otp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username })
  });
  const data = await res.json();
  alert(data.message || (data.success ? 'OTP sent!' : 'Failed to send OTP'));
});

// --- Auth form submit ---
authForm.addEventListener('submit', async e => {
  e.preventDefault();

  const email    = emailField.value.trim();
  const password = passwordField.value.trim();
  const username = usernameField.value.trim();
  const otp      = otpField.value.trim();

  let res;
  if (mode === 'login') {
    res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } else {
    res = await fetch('/signup/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, username, otp })
    });
  }

  const data = await res.json();
  if (!data.success) return alert(data.message || 'Authentication failed');

  socket = io({ auth: { token: data.token } });
  setupSocket();

  authContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
});

// --- Socket Setup ---
function setupSocket() {
  socket.on('chat message', data => {
    const li = document.createElement('li');

    if (data.type === 'file') {
      li.innerHTML = `<strong>${data.username}:</strong> <a href="${data.fileUrl}" target="_blank">${data.originalName}</a>`;
    } else if (data.type === 'image') {
      li.innerHTML = `<strong>${data.username}:</strong><br><img src="${data.fileUrl}" alt="Image" />`;
    } else {
      li.innerHTML = `<strong>${data.username}:</strong> ${data.msg}`;
    }

    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('typing', ({ username }) => {
    if (username) {
      typingIndicator.innerText = `${username} is typing...`;
      typingIndicator.style.display = 'block';
    } else {
      typingIndicator.style.display = 'none';
    }
  });
}

// --- Chat submit ---
chatForm.addEventListener('submit', async e => {
  e.preventDefault();

  const text = input.value.trim();
  const file = fileInput.files[0];

  if (file) {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/upload', {
      method: 'POST',
      body: formData
    });

    const data = await res.json();
    if (data.success) {
      socket.emit('chat message', data.fileData);
    }
    fileInput.value = '';
  }

  if (text) {
    socket.emit('chat message', { type: 'text', msg: text });
    input.value = '';
  }
});

// --- Typing Indicator Logic ---
let typing = false, timer;
input.addEventListener('input', () => {
  if (!typing) {
    socket.emit('typing');
    typing = true;
  }
  clearTimeout(timer);
  timer = setTimeout(() => {
    typing = false;
    socket.emit('typing', { username: null });
  }, 1500);
});

// --- Logout ---
document.getElementById('logout-btn').addEventListener('click', () => {
  if (socket) socket.disconnect();
  chatContainer.style.display = 'none';
  authContainer.style.display = 'flex';
  authForm.reset();
});
