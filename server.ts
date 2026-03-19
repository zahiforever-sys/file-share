import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import multer from 'multer';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const id = nanoid(10);
    cb(null, `${id}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB limit
});

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = 3000;

  // In-memory store for active transfers
  const transfers = new Map();

  app.use(express.json());

  // API Routes
  app.post('/api/upload', upload.single('file'), (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const transferId = nanoid(6).toUpperCase();
    const fileData = {
      id: transferId,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      createdAt: Date.now()
    };

    transfers.set(transferId, fileData);

    // Auto-delete after 30 minutes
    setTimeout(() => {
      if (transfers.has(transferId)) {
        const data = transfers.get(transferId);
        const filePath = path.join(uploadDir, data.filename);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
        transfers.delete(transferId);
      }
    }, 30 * 60 * 1000);

    res.json(fileData);
  });

  app.get('/api/file/:id', (req, res) => {
    const data = transfers.get(req.params.id);
    if (!data) {
      return res.status(404).json({ error: 'File not found or expired' });
    }
    res.json({
      originalName: data.originalName,
      size: data.size,
      mimetype: data.mimetype
    });
  });

  app.get('/api/download/:id', (req, res) => {
    const data = transfers.get(req.params.id);
    if (!data) {
      return res.status(404).send('File not found or expired');
    }

    const filePath = path.join(uploadDir, data.filename);
    res.download(filePath, data.originalName);
    
    // Notify sender via socket
    io.to(req.params.id).emit('download-started');
  });

  // Socket.io logic
  io.on('connection', (socket) => {
    socket.on('join-transfer', (transferId) => {
      socket.join(transferId);
      console.log(`Socket ${socket.id} joined transfer ${transferId}`);
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
