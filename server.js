const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(express.static(path.join(__dirname, 'public')));

// Храним данные пользователей: { "Имя": "Число/Значение" }
const usersData = {};

io.on('connection', (socket) => {
  let currentUserName = "";

  // Пользователь вводит имя при входе
  socket.on('join_user', (name) => {
    currentUserName = name;
    if (!usersData[currentUserName]) {
      usersData[currentUserName] = "0"; // Начальное значение по умолчанию
    }
    // Отправляем обновленный список всех пользователей каждому клиенту
    io.emit('update_table', usersData);
  });

  // Пользователь нажимает PUSH для отправки своего числа
  socket.on('push_data', (value) => {
    if (currentUserName) {
      usersData[currentUserName] = value;
      io.emit('update_table', usersData);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
