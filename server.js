const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// База данных в памяти:
// users = { "логин": { hash: "хэш_пароля", salt: "соль", value: "0" } }
const users = {};

// Функция для безопасного хэширования паролей
function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

io.on('connection', (socket) => {
  let currentUser = null;

  // 1. РЕГИСТРАЦИЯ
  socket.on('register', ({ username, password }) => {
    const name = username.trim();
    if (!name || !password) {
      return socket.emit('auth_error', 'Имя и пароль не могут быть пустыми');
    }
    if (users[name]) {
      return socket.emit('auth_error', 'Пользователь с таким именем уже существует');
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const hash = hashPassword(password, salt);

    users[name] = { hash, salt, value: "0" };
    socket.emit('auth_success', { username: name, message: 'Регистрация успешна! Теперь войдите.' });
  });

  // 2. ВХОД
  socket.on('login', ({ username, password }) => {
    const name = username.trim();
    const user = users[name];

    if (!user) {
      return socket.emit('auth_error', 'Пользователь не найден. Зарегистрируйтесь!');
    }

    const hash = hashPassword(password, user.salt);
    if (hash !== user.hash) {
      return socket.emit('auth_error', 'Неверный пароль');
    }

    currentUser = name;
    
    // Собираем таблицу значений для отправки клиенту
    const tableData = {};
    for (const [u, data] of Object.entries(users)) {
      tableData[u] = data.value;
    }

    socket.emit('login_success', { username: currentUser, tableData });
    io.emit('update_table', tableData);
  });

  // 3. ОТПРАВКА ЧИСЛА (PUSH)
  socket.on('push_data', (value) => {
    if (currentUser && users[currentUser]) {
      users[currentUser].value = value;

      const tableData = {};
      for (const [u, data] of Object.entries(users)) {
        tableData[u] = data.value;
      }

      io.emit('update_table', tableData);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
