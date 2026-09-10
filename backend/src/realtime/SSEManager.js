/**
 * SSEManager - Alternative Server-Sent Events pour les clients ne supportant pas
 * les WebSockets. Maintient un registre de connexions ouvertes par "room" logique.
 */
class SSEManager {
  constructor() {
    this.clientsByRoom = new Map(); // room -> Set<res>
  }

  registerClient(room, res) {
    if (!this.clientsByRoom.has(room)) this.clientsByRoom.set(room, new Set());
    this.clientsByRoom.get(room).add(res);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(':ok\n\n');

    res.on('close', () => this.clientsByRoom.get(room)?.delete(res));
  }

  broadcastToRoom(room, event, payload) {
    const clients = this.clientsByRoom.get(room);
    if (!clients) return;
    const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
    clients.forEach((res) => res.write(message));
  }
}

module.exports = new SSEManager();
