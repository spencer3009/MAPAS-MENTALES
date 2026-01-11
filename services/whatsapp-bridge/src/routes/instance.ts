/**
 * Instance Routes - WhatsApp Bridge API
 */

import { Router, Request, Response } from 'express';
import { WhatsAppManager } from '../services/WhatsAppManager';

export const instanceRouter = Router();

/**
 * POST /bridge/instances/:workspaceId/start
 * Start WhatsApp connection for a workspace
 */
instanceRouter.post('/:workspaceId/start', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const whatsappManager: WhatsAppManager = req.app.locals.whatsappManager;
  
  try {
    const result = await whatsappManager.startInstance(workspaceId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /bridge/instances/:workspaceId/qr
 * Get QR code for a workspace
 */
instanceRouter.get('/:workspaceId/qr', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const whatsappManager: WhatsAppManager = req.app.locals.whatsappManager;
  
  try {
    const qr = whatsappManager.getQRCode(workspaceId);
    
    if (!qr) {
      const status = whatsappManager.getStatus(workspaceId);
      if (status.status === 'connected') {
        return res.json({ 
          qr: null, 
          status: 'connected',
          message: 'Already connected, no QR needed' 
        });
      }
      return res.json({ 
        qr: null, 
        status: status.status,
        message: 'QR not available yet, start connection first' 
      });
    }
    
    res.json({ qr, status: 'waiting_qr' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /bridge/instances/:workspaceId/status
 * Get connection status for a workspace
 */
instanceRouter.get('/:workspaceId/status', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const whatsappManager: WhatsAppManager = req.app.locals.whatsappManager;
  
  try {
    const status = whatsappManager.getStatus(workspaceId);
    res.json(status);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /bridge/instances/:workspaceId/disconnect
 * Disconnect WhatsApp for a workspace
 */
instanceRouter.post('/:workspaceId/disconnect', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const whatsappManager: WhatsAppManager = req.app.locals.whatsappManager;
  
  try {
    const result = await whatsappManager.disconnect(workspaceId);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /bridge/instances/:workspaceId/send
 * Send a message
 */
instanceRouter.post('/:workspaceId/send', async (req: Request, res: Response) => {
  const { workspaceId } = req.params;
  const { phone, text } = req.body;
  const whatsappManager: WhatsAppManager = req.app.locals.whatsappManager;
  
  if (!phone || !text) {
    return res.status(400).json({ success: false, message: 'phone and text are required' });
  }
  
  try {
    const result = await whatsappManager.sendMessage(workspaceId, phone, text);
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
