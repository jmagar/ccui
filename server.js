const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url, true);
    await handle(req, res, parsedUrl);
  });
  
  // Start WebSocket server
  if (typeof require !== 'undefined') {
    try {
      const { WebSocketManager } = require('./lib/websocket/websocket-server.ts');
      const wsManager = new WebSocketManager(3001);
      
      console.log('WebSocket server started on port 3001');
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        wsManager.close();
        server.close(() => {
          process.exit(0);
        });
      });
    } catch (error) {
      console.warn('Could not start WebSocket server:', error.message);
    }
  }

  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});