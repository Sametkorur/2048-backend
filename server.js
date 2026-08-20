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

let waitingPlayer = null;

io.on('connection', (socket) => {
    console.log('Bir oyuncu bağlandı:', socket.id);

    socket.on('join_queue', (data) => {
        socket.classType = data.classType;

        if (waitingPlayer && waitingPlayer.id !== socket.id) {
            const roomName = 'room_' + socket.id;
            socket.join(roomName);
            waitingPlayer.join(roomName);

            io.to(waitingPlayer.id).emit('game_start', { role: 'p1', opponentClass: socket.classType });
            io.to(socket.id).emit('game_start', { role: 'p2', opponentClass: waitingPlayer.classType });

            socket.roomId = roomName;
            waitingPlayer.roomId = roomName;
            waitingPlayer = null;
        } else {
            waitingPlayer = socket;
            socket.emit('waiting', 'Rakip aranıyor...');
        }
    });

    socket.on('sync_state', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_state', data);
    });

    socket.on('attack_opponent', (data) => {
        if (socket.roomId) socket.to(socket.roomId).emit('receive_attack', data);
    });

    socket.on('disconnect', () => {
        if (waitingPlayer === socket) waitingPlayer = null;
        if (socket.roomId) socket.to(socket.roomId).emit('opponent_disconnected');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Sunucu aktif!`);
});
