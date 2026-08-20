const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors()); 

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", 
        methods: ["GET", "POST"]
    }
});

// Kurşun geçirmez basit oda sistemimiz
const activeRooms = {}; 

io.on('connection', (socket) => {
    socket.on('join_room', (data) => {
        const roomId = data.roomId;
        socket.classType = data.classType;
        socket.roomId = roomId;

        if (!activeRooms[roomId]) {
            // Odayı ilk sen kurdun
            activeRooms[roomId] = { p1: socket, p2: null };
            socket.join(roomId);
            socket.emit('waiting', 'Oda Kuruldu. Adem Baba Bekleniyor...');
        } 
        else if (activeRooms[roomId].p2 === null) {
            // Adem odaya geldi
            activeRooms[roomId].p2 = socket;
            socket.join(roomId);

            const p1Socket = activeRooms[roomId].p1;

            // İki taraf için de oyunu başlat
            p1Socket.emit('game_start', { role: 'p1', opponentClass: socket.classType });
            socket.emit('game_start', { role: 'p2', opponentClass: p1Socket.classType });
        } 
        else {
            socket.emit('room_full', 'Bu oda şu an 2 kişiyle dolu!');
        }
    });

    socket.on('sync_state', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_state', data);
    });

    socket.on('attack_opponent', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('receive_attack', data);
    });

    socket.on('disconnect', () => {
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponent_disconnected');
            // Biri çıkarsa odayı temizle
            delete activeRooms[socket.roomId];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu Aktif!`);
});
