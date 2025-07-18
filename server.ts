import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '4000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Track if WebSocket server is already running
let wsManagerInstance: any = null;

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    const parsedUrl = parse(req.url || '/', true);
    await handle(req, res, parsedUrl);
  });
  
  // Start WebSocket server
  if (!wsManagerInstance) {
    try {
      const { WebSocketManager } = await import('./lib/websocket/websocket-server');
      wsManagerInstance = new WebSocketManager(4001);
      
      // Graceful shutdown
      process.on('SIGTERM', () => {
        console.log('SIGTERM received, shutting down gracefully');
        wsManagerInstance.close();
        server.close(() => {
          process.exit(0);
        });
      });
    } catch (error) {
      console.warn('Could not start WebSocket server:', error);
    }
  }

  server.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
  
  server.on('error', (err) => {
    throw err;
  });
});