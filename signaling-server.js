// Simple Socket.IO signaling server
// Run with: npm run signal (uses default port 3000) or: PORT=4000 node signaling-server.js

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('DesktopShare signaling server running\n');
});

const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

io.on('connection', (socket) => {
  console.log('Client connected', socket.id);

  socket.on('signal', (data) => {
    // Relay signaling data to all other clients
    socket.broadcast.emit('signal', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected', socket.id);
  });
});

server.listen(PORT, () => console.log(`Signaling server listening on http://localhost:${PORT}`));
