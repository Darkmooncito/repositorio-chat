# Servidor de Chat WebSocket

Servidor de chat en tiempo real con soporte para salas y historial de mensajes.

## 🚀 Características

- Chat en tiempo real con WebSocket
- Soporte para múltiples salas
- Historial de mensajes (hasta 100 por sala)
- Notificaciones de usuarios uniéndose/saliendo
- Persistencia temporal de salas vacías (1 hora)
- CORS configurable
- Health check endpoint

## 📋 Requisitos

- Node.js 18+
- npm o yarn

## 🛠️ Instalación

```bash
npm install
```

## ⚙️ Configuración

Copia el archivo `.env.example` a `.env`:

```bash
cp .env.example .env
```

Configura las variables:

```env
PORT=3002
ORIGIN=http://localhost:5173,http://localhost:3000
```

## 🏃 Ejecutar

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📡 API de Socket.IO

### Eventos del Cliente → Servidor

#### `join-room`
Unirse a una sala de chat.
```typescript
socket.emit('join-room', { 
  roomId: string, 
  username: string 
});
```

#### `send-message`
Enviar un mensaje a la sala.
```typescript
socket.emit('send-message', { 
  roomId: string,
  username: string,
  text: string 
});
```

#### `leave-room`
Salir de la sala.
```typescript
socket.emit('leave-room');
```

### Eventos del Servidor → Cliente

#### `message-history`
Historial de mensajes al unirse a la sala.
```typescript
socket.on('message-history', (messages: Message[]) => {
  // Mostrar historial
});

interface Message {
  id: string;
  username: string;
  text: string;
  timestamp: string;
}
```

#### `message`
Nuevo mensaje en la sala.
```typescript
socket.on('message', (message: Message) => {
  // Mostrar mensaje
});
```

#### `user-joined`
Usuario se unió a la sala.
```typescript
socket.on('user-joined', ({ username }) => {
  // Notificar que el usuario se unió
});
```

#### `user-left`
Usuario salió de la sala.
```typescript
socket.on('user-left', ({ username }) => {
  // Notificar que el usuario salió
});
```

## 🏥 Health Check

Endpoint para verificar el estado del servidor:

```bash
GET http://localhost:3002/health
```

Respuesta:
```json
{
  "status": "ok",
  "rooms": 3,
  "totalUsers": 8,
  "totalMessages": 156
}
```

## 🔧 Características Avanzadas

### Historial de Mensajes
- Cada sala mantiene hasta 100 mensajes más recientes
- Los mensajes antiguos se eliminan automáticamente
- El historial se envía al unirse a la sala

### Persistencia de Salas
- Las salas vacías se mantienen por 1 hora
- Permite que usuarios vuelvan a unirse sin perder historial
- Después de 1 hora, la sala y su historial se eliminan

### Formato de Mensajes

```typescript
interface Message {
  id: string;           // UUID único
  username: string;     // Nombre del usuario
  text: string;         // Contenido del mensaje
  timestamp: string;    // ISO 8601 timestamp
}
```

## 📊 Ejemplo de Flujo

```
Cliente A                  Servidor                  Cliente B
   |                          |                          |
   |---- join-room ---------->|                          |
   |<--- message-history -----|                          |
   |                          |<----- join-room ---------|
   |<--- user-joined ---------|                          |
   |                          |---- message-history ---->|
   |                          |---- user-joined -------->|
   |                          |                          |
   |--- send-message -------->|                          |
   |<------ message ----------|                          |
   |                          |------- message --------->|
   |                          |                          |
   |                          |<--- send-message --------|
   |<------ message ----------|                          |
   |                          |------- message --------->|
```

## 🔒 Seguridad

- CORS configurado por origen
- Validación de datos de entrada
- Limitación de historial de mensajes
- Limpieza automática de salas

## 📝 Licencia

MIT
