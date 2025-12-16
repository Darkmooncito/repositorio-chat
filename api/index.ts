import { Server, Socket } from 'socket.io';
import express from 'express';
import http from 'http';
import cors from 'cors';
import 'dotenv/config';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);

const origins = (process.env.ORIGIN ?? '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const io = new Server(server, {
  cors: {
    origin: origins.length > 0 ? origins : '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors({
  origin: origins.length > 0 ? origins : '*',
  credentials: true
}));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    rooms: rooms.size,
    totalUsers: Array.from(rooms.values()).reduce((acc, room) => acc + room.users.size, 0),
    totalMessages: Array.from(rooms.values()).reduce((acc, room) => acc + room.messages.length, 0)
  });
});

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}

interface UserInfo {
  socketId: string;
  username: string;
  roomId: string;
  joinedAt: Date;
}

interface Room {
  id: string;
  users: Set<string>;
  messages: Message[];
  createdAt: Date;
}

// Estructura: roomId -> Room
const rooms = new Map<string, Room>();
// Estructura: socketId -> UserInfo
const users = new Map<string, UserInfo>();

const MAX_MESSAGES_PER_ROOM = 100;
const port = Number(process.env.PORT) || 3002;

io.on('connection', (socket: Socket) => {
  console.log(`✅ New connection: ${socket.id}`);

  // Unirse a una sala de chat
  socket.on('join-room', ({ roomId, username }: { roomId: string; username: string }) => {
    console.log(`👤 ${username} (${socket.id}) joining chat room: ${roomId}`);

    // Guardar información del usuario
    users.set(socket.id, {
      socketId: socket.id,
      username,
      roomId,
      joinedAt: new Date()
    });

    // Crear sala si no existe
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        users: new Set(),
        messages: [],
        createdAt: new Date()
      });
      console.log(`🏠 Created new chat room: ${roomId}`);
    }

    const room = rooms.get(roomId)!;
    room.users.add(socket.id);
    socket.join(roomId);

    // Enviar historial de mensajes al nuevo usuario
    socket.emit('message-history', room.messages);

    // Notificar a otros usuarios
    socket.to(roomId).emit('user-joined', { username });

    console.log(`📊 Chat room ${roomId} now has ${room.users.size} user(s)`);
  });

  // Enviar mensaje
  socket.on('send-message', ({ roomId, username, text }: { roomId: string; username: string; text: string }) => {
    const room = rooms.get(roomId);
    const user = users.get(socket.id);

    if (!room || !user) {
      console.error(`❌ User ${socket.id} not in room ${roomId}`);
      return;
    }

    // Crear mensaje
    const message: Message = {
      id: uuidv4(),
      username,
      text,
      timestamp: new Date().toISOString()
    };

    // Guardar mensaje en historial
    room.messages.push(message);

    // Limitar historial de mensajes
    if (room.messages.length > MAX_MESSAGES_PER_ROOM) {
      room.messages.shift();
    }

    console.log(`💬 ${username} in ${roomId}: ${text}`);

    // Enviar mensaje a todos en la sala (incluyendo el emisor)
    io.to(roomId).emit('message', message);
  });

  // Salir de la sala
  socket.on('leave-room', () => {
    handleDisconnect(socket.id);
  });

  // Desconexión
  socket.on('disconnect', () => {
    console.log(`❌ Disconnection: ${socket.id}`);
    handleDisconnect(socket.id);
  });

  function handleDisconnect(socketId: string) {
    const user = users.get(socketId);
    if (user) {
      const { roomId, username } = user;
      const room = rooms.get(roomId);

      if (room) {
        room.users.delete(socketId);
        
        // Notificar a otros usuarios
        socket.to(roomId).emit('user-left', { username });

        console.log(`👋 ${username} left chat room ${roomId}. ${room.users.size} user(s) remaining`);

        // Eliminar sala si está vacía (opcional: mantener historial)
        if (room.users.size === 0) {
          // Mantener la sala por 1 hora para preservar historial
          setTimeout(() => {
            const currentRoom = rooms.get(roomId);
            if (currentRoom && currentRoom.users.size === 0) {
              rooms.delete(roomId);
              console.log(`🗑️  Chat room ${roomId} deleted (empty for 1 hour)`);
            }
          }, 60 * 60 * 1000); // 1 hora
        }
      }

      users.delete(socketId);
    }
  }
});

server.listen(port, () => {
  console.log(`🚀 Chat Server running on port ${port}`);
  console.log(`📡 CORS enabled for: ${origins.length > 0 ? origins.join(', ') : 'all origins'}`);
});