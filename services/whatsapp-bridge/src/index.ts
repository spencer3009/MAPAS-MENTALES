/**
 * WhatsApp Bridge Service - Main Entry Point
 * Handles WhatsApp Web connections using Baileys library
 */

import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import { MongoClient, Db } from 'mongodb';
import pino from 'pino';

import { instanceRouter } from './routes/instance';
import { WhatsAppManager } from './services/WhatsAppManager';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3001;
const MONGO_URL = process.env.MONGO_URL || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'test_database';

// Logger
export const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true
    }
  }
});

// Express app
const app = express();
app.use(cors());
app.use(express.json());

// HTTP Server
const server = http.createServer(app);

// WebSocket Server for realtime events
const wss = new WebSocketServer({ server, path: '/ws' });

// Store WebSocket connections per workspace
const wsConnections = new Map<string, Set<WebSocket>>();

// MongoDB connection
let db: Db;
let mongoClient: MongoClient;

// WhatsApp Manager instance
export let whatsappManager: WhatsAppManager;

// Broadcast event to all connected clients of a workspace
export function broadcastToWorkspace(workspaceId: string, event: string, data: any) {
  const connections = wsConnections.get(workspaceId);
  if (connections) {
    const message = JSON.stringify({ event, data, workspaceId });
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }
}

// WebSocket connection handler
wss.on('connection', (ws, req) => {
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const workspaceId = url.searchParams.get('workspaceId');
  
  if (!workspaceId) {
    ws.close(4000, 'Missing workspaceId');
    return;
  }
  
  logger.info(`WebSocket connected for workspace: ${workspaceId}`);
  
  // Add to workspace connections
  if (!wsConnections.has(workspaceId)) {
    wsConnections.set(workspaceId, new Set());
  }
  wsConnections.get(workspaceId)!.add(ws);
  
  ws.on('close', () => {
    logger.info(`WebSocket disconnected for workspace: ${workspaceId}`);
    wsConnections.get(workspaceId)?.delete(ws);
    if (wsConnections.get(workspaceId)?.size === 0) {
      wsConnections.delete(workspaceId);
    }
  });
  
  ws.on('error', (error) => {
    logger.error({ error }, 'WebSocket error');
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'whatsapp-bridge',
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/bridge/instances', instanceRouter);

// Start server
async function start() {
  try {
    // Connect to MongoDB
    mongoClient = new MongoClient(MONGO_URL);
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    logger.info('Connected to MongoDB');
    
    // Initialize WhatsApp Manager
    whatsappManager = new WhatsAppManager(db, broadcastToWorkspace);
    
    // Make db available to routes
    app.locals.db = db;
    app.locals.whatsappManager = whatsappManager;
    
    // Restore existing sessions on startup
    await whatsappManager.restoreAllSessions();
    
    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`WhatsApp Bridge Server running on port ${PORT}`);
      logger.info(`WebSocket available at ws://localhost:${PORT}/ws`);
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down...');
  await whatsappManager?.disconnectAll();
  await mongoClient?.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await whatsappManager?.disconnectAll();
  await mongoClient?.close();
  process.exit(0);
});

start();
