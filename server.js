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

// Basit ve hatasız kendi oda takip sistemimiz
const activeRooms = {}; 

io.on('connection', (socket) => {
    console.log('Savaşçı bağlandı:', socket.id);

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
            // Adem odaya geldi (İkinci kişi)
            activeRooms[roomId].p2 = socket;
            socket.join(roomId);

            const p1Socket = activeRooms[roomId].p1;

            // Oyunu iki taraf için de BAŞLAT!
            p1Socket.emit('game_start', { role: 'p1', opponentClass: socket.classType });
            socket.emit('game_start', { role: 'p2', opponentClass: p1Socket.classType });
        } 
        else {
            // Odaya 3. biri girmeye çalışırsa
            socket.emit('room_full', 'Bu oda şu an 2 kişiyle dolu!');
        }
    });

    // Hamleleri rakibe ilet
    socket.on('sync_state', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_state', data);
    });

    // Hasarı rakibe ilet
    socket.on('attack_opponent', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('receive_attack', data);
    });

    socket.on('disconnect', () => {
        console.log('Savaşçı koptu:', socket.id);
        if (socket.roomId) {
            socket.to(socket.roomId).emit('opponent_disconnected');
            // Biri çıkarsa bug olmasın diye odayı komple kapatıyoruz
            delete activeRooms[socket.roomId];
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Kurşun Geçirmez Aracı Sunucu Aktif!`);
});
