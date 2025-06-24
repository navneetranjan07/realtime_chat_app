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
const messages       = document.getElementById('messages');
const typingIndicator = document.getElementById('typing-indicator');
const uploadForm     = document.getElementById('uploadForm');
const fileInput      = document.getElementById('fileInput');

// Toggle login/signup mode
toggleLink.addEventListener('click', e => {
  e.preventDefault();
  mode = mode === 'login' ? 'signup' : 'login';
  formTitle.textContent = mode === 'login' ? 'Login to Chat' : 'Sign up to Chat';
  authForm.querySelector('button').textContent = mode === 'login' ? 'Login' : 'Sign up';
  toggleFormLine.innerHTML = mode === 'login'
    ? `Don’t have an account? <a href="#" id="toggle-link">Sign up</a>`
    : `Already have an account? <a href="#" id="toggle-link">Login</a>`;
  toggleFormLine.querySelector('a').addEventListener('click', toggleLink.onclick);
});

// Auth form submit
authForm.addEventListener('submit', async e => {
  e.preventDefault();
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();

  const res = await fetch(`/${mode}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const data = await res.json();
  if (!data.success) return alert(data.message || 'Auth failed');

  socket = io({ auth: { token: data.token } });
  socket.user = { email };
  setupSocket();

  authContainer.style.display = 'none';
  chatContainer.style.display = 'flex';
});

// Setup socket events
function setupSocket() {
  socket.on('chat message', data => {
    const li = document.createElement('li');
    const time = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (data.fileUrl) {
      if (data.fileType.startsWith('image')) {
        li.innerHTML = `<strong>${data.msg}</strong><br>
                        <img src="${data.fileUrl}" style="max-width: 100%; border-radius: 8px;"><br>
                        <small>${time}</small>`;
      } else {
        li.innerHTML = `<strong>${data.msg}</strong><br>
                        <a href="${data.fileUrl}" download="${data.fileName}">${data.fileName}</a><br>
                        <small>${time}</small>`;
      }
    } else {
      li.textContent = `${data.msg} (${time})`;
    }

    messages.appendChild(li);
    messages.scrollTop = messages.scrollHeight;
  });

  socket.on('displayTyping', data => {
    if (data.email !== socket.user?.email) {
      typingIndicator.textContent = `${data.email} is typing...`;
      typingIndicator.classList.add('show');
    }
  });

  socket.on('removeTyping', () => {
    typingIndicator.classList.remove('show');
  });
}

// Chat form submit
chatForm.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (text && socket) {
    socket.emit('chat message', { msg: text });
    socket.emit('stopTyping');
    input.value = '';
  }
});

// Typing indicator event
let typingTimer;
input.addEventListener('input', () => {
  if (socket) {
    socket.emit('typing');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit('stopTyping');
    }, 1000);
  }
});

// Upload file form
uploadForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!fileInput.files[0]) return;

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  const res = await fetch('/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (data.success) {
    socket.emit('chat message', {
      fileUrl: data.fileUrl,
      fileName: data.name,
      fileType: data.type
    });
    fileInput.value = '';
  } else {
    alert('Upload failed.');
  }
});

// Logout
document.getElementById('logout-btn').addEventListener('click', () => {
  if (socket) socket.disconnect();
  chatContainer.style.display = 'none';
  authContainer.style.display = 'flex';
  authForm.reset();
});
