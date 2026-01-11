/**
 * WhatsApp Connection Settings Component
 * Allows users to connect their WhatsApp account via QR code
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MessageSquare, 
  QrCode, 
  Smartphone, 
  Check, 
  X, 
  Loader2, 
  RefreshCw,
  Wifi,
  WifiOff,
  Phone,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const API_URL = process.env.REACT_APP_BACKEND_URL || '';

const WhatsAppSettings = () => {
  const { token } = useAuth();
  const [status, setStatus] = useState('disconnected'); // waiting_qr | connecting | connected | disconnected | error
  const [qrCode, setQrCode] = useState(null);
  const [phone, setPhone] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);
  const wsRef = useRef(null);

  // Fetch current status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStatus(data.status || 'disconnected');
        setPhone(data.phone);
        
        // If connected, stop polling for QR
        if (data.status === 'connected') {
          stopPolling();
          setQrCode(null);
        }
      }
    } catch (err) {
      console.error('Error fetching status:', err);
    }
  }, [token]);

  // Fetch QR code
  const fetchQR = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/qr`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        if (data.status === 'connected') {
          setStatus('connected');
          setQrCode(null);
          stopPolling();
          await fetchStatus();
        } else if (data.qr) {
          setQrCode(data.qr);
          setStatus('waiting_qr');
        }
      }
    } catch (err) {
      console.error('Error fetching QR:', err);
    }
  }, [token, fetchStatus]);

  // Start QR polling
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    
    // Poll every 3 seconds for QR updates and status
    pollingRef.current = setInterval(async () => {
      await fetchQR();
      await fetchStatus();
    }, 3000);
  }, [fetchQR, fetchStatus]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Connect WhatsApp
  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/connect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('connecting');
        // Start polling for QR code
        startPolling();
        // Immediately try to get QR
        setTimeout(fetchQR, 1000);
      } else {
        setError(data.message || 'Error al conectar');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Connect error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Disconnect WhatsApp
  const handleDisconnect = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/whatsapp/disconnect`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setStatus('disconnected');
        setPhone(null);
        setQrCode(null);
        stopPolling();
      } else {
        setError(data.message || 'Error al desconectar');
      }
    } catch (err) {
      setError('Error de conexión con el servidor');
      console.error('Disconnect error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Refresh QR code
  const handleRefreshQR = async () => {
    setLoading(true);
    await handleDisconnect();
    setTimeout(handleConnect, 500);
  };

  // Initial status check
  useEffect(() => {
    fetchStatus();
    
    return () => {
      stopPolling();
    };
  }, [fetchStatus, stopPolling]);

  // Status config
  const getStatusConfig = () => {
    const configs = {
      connected: {
        icon: Wifi,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        label: 'Conectado',
        description: phone ? `+${phone}` : 'WhatsApp activo'
      },
      waiting_qr: {
        icon: QrCode,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-100',
        label: 'Esperando escaneo',
        description: 'Escanea el código QR con tu teléfono'
      },
      connecting: {
        icon: Loader2,
        color: 'text-blue-500',
        bgColor: 'bg-blue-100',
        label: 'Conectando...',
        description: 'Estableciendo conexión'
      },
      disconnected: {
        icon: WifiOff,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        label: 'Desconectado',
        description: 'Conecta tu WhatsApp para comenzar'
      },
      error: {
        icon: AlertCircle,
        color: 'text-red-500',
        bgColor: 'bg-red-100',
        label: 'Error',
        description: error || 'Ha ocurrido un error'
      }
    };
    return configs[status] || configs.disconnected;
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
          <MessageSquare className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">WhatsApp</h1>
          <p className="text-gray-500">Conecta tu cuenta de WhatsApp</p>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado de conexión</h2>
        <StatusIndicator />
      </div>

      {/* QR Code Section */}
      {(status === 'waiting_qr' || status === 'connecting') && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Escanea el código QR</h2>
          
          <div className="flex flex-col items-center">
            {qrCode ? (
              <div className="relative">
                <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-gray-200">
                  <img 
                    src={qrCode} 
                    alt="WhatsApp QR Code" 
                    className="w-64 h-64 object-contain"
                  />
                </div>
                <button
                  onClick={handleRefreshQR}
                  disabled={loading}
                  className="absolute -top-2 -right-2 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                  title="Actualizar QR"
                >
                  <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            ) : (
              <div className="w-64 h-64 bg-gray-100 rounded-xl flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
              </div>
            )}
            
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600 mb-2">
                <span className="font-semibold">Instrucciones:</span>
              </p>
              <ol className="text-sm text-gray-500 text-left space-y-1">
                <li>1. Abre WhatsApp en tu teléfono</li>
                <li>2. Ve a <strong>Ajustes → Dispositivos vinculados</strong></li>
                <li>3. Toca <strong>Vincular un dispositivo</strong></li>
                <li>4. Escanea este código QR</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Connected Info */}
      {status === 'connected' && phone && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Información del dispositivo</h2>
          
          <div className="flex items-center gap-4 p-4 bg-green-50 rounded-xl">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <Phone className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800">Número conectado</p>
              <p className="text-green-600">+{phone}</p>
            </div>
            <Check className="ml-auto w-6 h-6 text-green-500" />
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {status === 'disconnected' && (
          <button
            onClick={handleConnect}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Smartphone className="w-5 h-5" />
            )}
            Conectar WhatsApp
          </button>
        )}
        
        {status === 'connected' && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white rounded-xl font-semibold hover:bg-red-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <X className="w-5 h-5" />
            )}
            Desconectar
          </button>
        )}
        
        {(status === 'waiting_qr' || status === 'connecting') && (
          <button
            onClick={handleDisconnect}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gray-500 text-white rounded-xl font-semibold hover:bg-gray-600 transition-all shadow-lg hover:shadow-xl disabled:opacity-50"
          >
            <X className="w-5 h-5" />
            Cancelar
          </button>
        )}
      </div>

      {/* Help Section */}
      <div className="mt-8 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <h3 className="font-semibold text-blue-800 mb-2">¿Necesitas ayuda?</h3>
        <p className="text-sm text-blue-700">
          La conexión de WhatsApp te permite enviar y recibir mensajes directamente desde Mindora. 
          Tu cuenta permanecerá sincronizada mientras mantengas la sesión activa en tu teléfono.
        </p>
      </div>
    </div>
  );
};

export default WhatsAppSettings;
