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

io.on('connection', (socket) => {
    console.log('Savaşçı bağlandı:', socket.id);

    socket.on('join_room', (data) => {
        const roomName = data.roomId;
        socket.classType = data.classType;

        const room = io.sockets.adapter.rooms.get(roomName);
        const numClients = room ? room.size : 0;

        if (numClients === 0) {
            // İlk sen girdin, Adem'i bekliyorsun
            socket.join(roomName);
            socket.roomId = roomName;
            socket.emit('waiting', 'Oda Kuruldu. Adem Baba Bekleniyor...');
        } else if (numClients === 1) {
            // İkinci kişi geldi, savaşı başlat
            socket.join(roomName);
            socket.roomId = roomName;

            let otherSocketId;
            for (const id of room) {
                if (id !== socket.id) {
                    otherSocketId = id;
                    break;
                }
            }
            const otherSocket = io.sockets.sockets.get(otherSocketId);

            io.to(otherSocket.id).emit('game_start', { role: 'p1', opponentClass: socket.classType });
            io.to(socket.id).emit('game_start', { role: 'p2', opponentClass: otherSocket.classType });
        } else {
            // Odaya 3. kişi girmeye çalışırsa
            socket.emit('room_full', 'Bu oda şu an dolu!');
        }
    });

    socket.on('sync_state', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_state', data);
    });

    socket.on('attack_opponent', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('receive_attack', data);
    });

    socket.on('disconnect', () => {
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu aktif!`);
});
