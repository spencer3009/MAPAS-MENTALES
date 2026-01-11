/**
 * WhatsApp Manager Service
 * Handles multiple WhatsApp instances using Baileys
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  WASocket,
  ConnectionState,
  BaileysEventMap
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import { Db, ObjectId } from 'mongodb';
import * as QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';

const SESSIONS_PATH = process.env.SESSIONS_PATH || './sessions';

// Ensure sessions directory exists
if (!fs.existsSync(SESSIONS_PATH)) {
  fs.mkdirSync(SESSIONS_PATH, { recursive: true });
}

interface WhatsAppInstance {
  socket: WASocket | null;
  qrCode: string | null;
  status: 'waiting_qr' | 'connected' | 'disconnected' | 'connecting' | 'error';
  phone: string | null;
  lastSeen: Date | null;
  workspaceId: string;
  reconnectAttempts: number;
}

type BroadcastFunction = (workspaceId: string, event: string, data: any) => void;

export class WhatsAppManager {
  private db: Db;
  private instances: Map<string, WhatsAppInstance> = new Map();
  private broadcast: BroadcastFunction;
  private logger = pino({ level: 'info' });

  constructor(db: Db, broadcastFn: BroadcastFunction) {
    this.db = db;
    this.broadcast = broadcastFn;
  }

  /**
   * Get or create instance for a workspace
   */
  private getOrCreateInstance(workspaceId: string): WhatsAppInstance {
    if (!this.instances.has(workspaceId)) {
      this.instances.set(workspaceId, {
        socket: null,
        qrCode: null,
        status: 'disconnected',
        phone: null,
        lastSeen: null,
        workspaceId,
        reconnectAttempts: 0
      });
    }
    return this.instances.get(workspaceId)!;
  }

  /**
   * Start WhatsApp connection for a workspace
   */
  async startInstance(workspaceId: string): Promise<{ success: boolean; message: string }> {
    const instance = this.getOrCreateInstance(workspaceId);
    
    if (instance.status === 'connected') {
      return { success: true, message: 'Already connected' };
    }
    
    if (instance.status === 'connecting') {
      return { success: true, message: 'Connection in progress' };
    }
    
    try {
      instance.status = 'connecting';
      await this.updateInstanceInDB(workspaceId, { status: 'connecting' });
      
      // Session path for this workspace
      const sessionPath = path.join(SESSIONS_PATH, workspaceId);
      
      // Initialize auth state
      const { state, saveCreds } = await useMultiFileAuthState(sessionPath);
      
      // Get latest Baileys version
      const { version } = await fetchLatestBaileysVersion();
      
      // Create socket
      const socket = makeWASocket({
        version,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, this.logger)
        },
        printQRInTerminal: false,
        logger: this.logger,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false,
        markOnlineOnConnect: true
      });
      
      instance.socket = socket;
      
      // Handle connection updates
      socket.ev.on('connection.update', async (update) => {
        await this.handleConnectionUpdate(workspaceId, update, saveCreds);
      });
      
      // Handle credentials update
      socket.ev.on('creds.update', saveCreds);
      
      // Handle incoming messages
      socket.ev.on('messages.upsert', async (m) => {
        await this.handleIncomingMessages(workspaceId, m);
      });
      
      // Handle message status updates
      socket.ev.on('messages.update', async (updates) => {
        await this.handleMessageUpdates(workspaceId, updates);
      });
      
      return { success: true, message: 'Connection started' };
    } catch (error: any) {
      this.logger.error({ error }, `Failed to start instance for ${workspaceId}`);
      instance.status = 'error';
      await this.updateInstanceInDB(workspaceId, { status: 'error' });
      return { success: false, message: error.message };
    }
  }

  /**
   * Handle connection state updates
   */
  private async handleConnectionUpdate(
    workspaceId: string, 
    update: Partial<ConnectionState>,
    saveCreds: () => Promise<void>
  ) {
    const instance = this.instances.get(workspaceId);
    if (!instance) return;
    
    const { connection, lastDisconnect, qr } = update;
    
    // QR Code received
    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, { 
          width: 300,
          margin: 2,
          color: { dark: '#000000', light: '#ffffff' }
        });
        instance.qrCode = qrDataUrl;
        instance.status = 'waiting_qr';
        
        await this.updateInstanceInDB(workspaceId, { 
          status: 'waiting_qr',
          updated_at: new Date()
        });
        
        // Broadcast QR update
        this.broadcast(workspaceId, 'qr_updated', { qr: qrDataUrl });
        this.logger.info(`QR generated for workspace ${workspaceId}`);
      } catch (error) {
        this.logger.error({ error }, 'Failed to generate QR code');
      }
    }
    
    // Connection state changed
    if (connection === 'close') {
      const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      
      this.logger.info(`Connection closed for ${workspaceId}, statusCode: ${statusCode}`);
      
      if (statusCode === DisconnectReason.loggedOut) {
        // User logged out, clear session
        instance.status = 'disconnected';
        instance.socket = null;
        instance.qrCode = null;
        instance.phone = null;
        
        // Clear session files
        const sessionPath = path.join(SESSIONS_PATH, workspaceId);
        if (fs.existsSync(sessionPath)) {
          fs.rmSync(sessionPath, { recursive: true, force: true });
        }
        
        await this.updateInstanceInDB(workspaceId, { 
          status: 'disconnected',
          phone: null,
          updated_at: new Date()
        });
        
        this.broadcast(workspaceId, 'disconnected', { reason: 'logged_out' });
      } else if (shouldReconnect && instance.reconnectAttempts < 5) {
        // Attempt reconnection
        instance.reconnectAttempts++;
        this.logger.info(`Reconnecting ${workspaceId}, attempt ${instance.reconnectAttempts}`);
        setTimeout(() => this.startInstance(workspaceId), 3000);
      } else {
        instance.status = 'disconnected';
        await this.updateInstanceInDB(workspaceId, { 
          status: 'disconnected',
          updated_at: new Date()
        });
        this.broadcast(workspaceId, 'disconnected', { reason: 'connection_lost' });
      }
    }
    
    if (connection === 'open') {
      instance.status = 'connected';
      instance.qrCode = null;
      instance.reconnectAttempts = 0;
      instance.lastSeen = new Date();
      
      // Get phone number from socket
      const user = instance.socket?.user;
      if (user) {
        instance.phone = user.id.split(':')[0] || user.id.split('@')[0];
      }
      
      await this.updateInstanceInDB(workspaceId, { 
        status: 'connected',
        phone: instance.phone,
        last_seen: new Date(),
        updated_at: new Date()
      });
      
      this.broadcast(workspaceId, 'connected', { 
        phone: instance.phone 
      });
      
      this.logger.info(`Connected: ${workspaceId}, phone: ${instance.phone}`);
    }
  }

  /**
   * Handle incoming messages
   */
  private async handleIncomingMessages(workspaceId: string, m: BaileysEventMap['messages.upsert']) {
    if (m.type !== 'notify') return;
    
    for (const msg of m.messages) {
      if (msg.key.fromMe) continue; // Skip outgoing messages
      
      const contactPhone = msg.key.remoteJid?.split('@')[0];
      if (!contactPhone) continue;
      
      const messageContent = msg.message?.conversation || 
                            msg.message?.extendedTextMessage?.text ||
                            msg.message?.imageMessage?.caption ||
                            '[Media]';
      
      // Store message in DB
      const messageDoc = {
        workspace_id: workspaceId,
        channel: 'whatsapp',
        contact_phone: contactPhone,
        direction: 'inbound',
        content: {
          type: 'text',
          text: messageContent
        },
        timestamp: new Date(parseInt(msg.messageTimestamp?.toString() || '0') * 1000),
        status: 'received',
        meta: {
          wa_message_id: msg.key.id,
          push_name: msg.pushName
        },
        created_at: new Date()
      };
      
      await this.db.collection('whatsapp_messages').insertOne(messageDoc);
      
      // Broadcast new message event
      this.broadcast(workspaceId, 'message_received', {
        from: contactPhone,
        pushName: msg.pushName,
        content: messageContent,
        timestamp: messageDoc.timestamp,
        messageId: msg.key.id
      });
      
      this.logger.info(`Message received from ${contactPhone}: ${messageContent.substring(0, 50)}...`);
    }
  }

  /**
   * Handle message status updates (delivered, read)
   */
  private async handleMessageUpdates(workspaceId: string, updates: BaileysEventMap['messages.update']) {
    for (const update of updates) {
      if (update.update.status) {
        const statusMap: Record<number, string> = {
          1: 'pending',
          2: 'sent',
          3: 'delivered',
          4: 'read'
        };
        
        const newStatus = statusMap[update.update.status] || 'unknown';
        
        await this.db.collection('whatsapp_messages').updateOne(
          { 'meta.wa_message_id': update.key.id },
          { $set: { status: newStatus, updated_at: new Date() } }
        );
        
        this.broadcast(workspaceId, 'message_status', {
          messageId: update.key.id,
          status: newStatus
        });
      }
    }
  }

  /**
   * Get QR code for a workspace
   */
  getQRCode(workspaceId: string): string | null {
    return this.instances.get(workspaceId)?.qrCode || null;
  }

  /**
   * Get status of a workspace instance
   */
  getStatus(workspaceId: string): { 
    status: string; 
    phone: string | null; 
    lastSeen: Date | null 
  } {
    const instance = this.instances.get(workspaceId);
    return {
      status: instance?.status || 'disconnected',
      phone: instance?.phone || null,
      lastSeen: instance?.lastSeen || null
    };
  }

  /**
   * Disconnect a workspace instance
   */
  async disconnect(workspaceId: string): Promise<{ success: boolean; message: string }> {
    const instance = this.instances.get(workspaceId);
    
    if (!instance || !instance.socket) {
      return { success: true, message: 'Already disconnected' };
    }
    
    try {
      await instance.socket.logout();
      instance.socket = null;
      instance.status = 'disconnected';
      instance.qrCode = null;
      instance.phone = null;
      
      // Clear session files
      const sessionPath = path.join(SESSIONS_PATH, workspaceId);
      if (fs.existsSync(sessionPath)) {
        fs.rmSync(sessionPath, { recursive: true, force: true });
      }
      
      await this.updateInstanceInDB(workspaceId, { 
        status: 'disconnected',
        phone: null,
        updated_at: new Date()
      });
      
      this.broadcast(workspaceId, 'disconnected', { reason: 'user_requested' });
      
      return { success: true, message: 'Disconnected successfully' };
    } catch (error: any) {
      this.logger.error({ error }, `Failed to disconnect ${workspaceId}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Send a message
   */
  async sendMessage(
    workspaceId: string, 
    phone: string, 
    text: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const instance = this.instances.get(workspaceId);
    
    if (!instance?.socket || instance.status !== 'connected') {
      return { success: false, error: 'WhatsApp not connected' };
    }
    
    try {
      // Format phone number for WhatsApp
      const jid = phone.includes('@') ? phone : `${phone.replace(/[^0-9]/g, '')}@s.whatsapp.net`;
      
      const result = await instance.socket.sendMessage(jid, { text });
      
      // Store outgoing message
      const messageDoc = {
        workspace_id: workspaceId,
        channel: 'whatsapp',
        contact_phone: phone.replace(/[^0-9]/g, ''),
        direction: 'outbound',
        content: {
          type: 'text',
          text
        },
        timestamp: new Date(),
        status: 'sent',
        meta: {
          wa_message_id: result?.key?.id
        },
        created_at: new Date()
      };
      
      await this.db.collection('whatsapp_messages').insertOne(messageDoc);
      
      return { success: true, messageId: result?.key?.id };
    } catch (error: any) {
      this.logger.error({ error }, 'Failed to send message');
      return { success: false, error: error.message };
    }
  }

  /**
   * Update instance in database
   */
  private async updateInstanceInDB(workspaceId: string, data: Record<string, any>) {
    await this.db.collection('whatsapp_instances').updateOne(
      { workspace_id: workspaceId },
      { 
        $set: data,
        $setOnInsert: { 
          workspace_id: workspaceId,
          created_at: new Date()
        }
      },
      { upsert: true }
    );
  }

  /**
   * Restore all existing sessions on startup
   */
  async restoreAllSessions() {
    try {
      const instances = await this.db.collection('whatsapp_instances')
        .find({ status: 'connected' })
        .toArray();
      
      for (const instance of instances) {
        const sessionPath = path.join(SESSIONS_PATH, instance.workspace_id);
        if (fs.existsSync(sessionPath)) {
          this.logger.info(`Restoring session for ${instance.workspace_id}`);
          await this.startInstance(instance.workspace_id);
        }
      }
    } catch (error) {
      this.logger.error({ error }, 'Failed to restore sessions');
    }
  }

  /**
   * Disconnect all instances (for graceful shutdown)
   */
  async disconnectAll() {
    for (const [workspaceId, instance] of this.instances) {
      if (instance.socket) {
        try {
          instance.socket.end(new Error('Server shutdown'));
        } catch (error) {
          this.logger.error({ error }, `Error disconnecting ${workspaceId}`);
        }
      }
    }
    this.instances.clear();
  }
}
