/**
 * AcceptInvitePage - Página para aceptar invitaciones de colaboración
 */

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import {
  Users,
  Check,
  X,
  Loader2,
  LogIn,
  Map,
  LayoutGrid,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const RESOURCE_ICONS = {
  mindmap: Map,
  board: LayoutGrid,
};

const RESOURCE_NAMES = {
  mindmap: 'mapa mental',
  board: 'tablero',
};

export function AcceptInvitePage({ token, onGoToLogin, onGoToDashboard }) {
  const { isAuthenticated, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [inviteInfo, setInviteInfo] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // Cargar información de la invitación (sin autenticación)
  useEffect(() => {
    const loadInviteInfo = async () => {
      if (!token) {
        setError('No se encontró el token de invitación');
        setLoading(false);
        return;
      }

      try {
        // Intentar obtener info del recurso compartido
        const response = await fetch(`${API_URL}/api/shared/${token}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.detail || 'Invitación no válida o expirada');
        }

        const data = await response.json();
        setInviteInfo(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadInviteInfo();
  }, [token]);

  // Aceptar invitación
  const handleAccept = async () => {
    if (!isAuthenticated) {
      onGoToLogin?.();
      return;
    }

    setAccepting(true);
    try {
      const authToken = localStorage.getItem('mm_auth_token');
      const response = await fetch(`${API_URL}/api/invites/accept/${token}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al aceptar la invitación');
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setAccepting(false);
    }
  };

  const ResourceIcon = inviteInfo?.resource?.type 
    ? RESOURCE_ICONS[inviteInfo.resource.type] || Users
    : Users;

  const resourceTypeName = inviteInfo?.resource?.type
    ? RESOURCE_NAMES[inviteInfo.resource.type]
    : 'recurso';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-slate-700">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
          <p className="mt-4 text-slate-300">Cargando invitación...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-slate-700">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">
            Invitación no válida
          </h1>
          <p className="mt-2 text-slate-400">
            {error}
          </p>
          <Button
            onClick={() => {
              window.history.replaceState({}, document.title, '/');
              window.location.reload();
            }}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
          >
            Ir al inicio
          </Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center border border-slate-700">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">
            ¡Invitación aceptada!
          </h1>
          <p className="mt-2 text-slate-400">
            Ahora tienes acceso al {resourceTypeName} &ldquo;{inviteInfo?.resource?.name}&rdquo;
          </p>
          <Button
            onClick={() => {
              window.history.replaceState({}, document.title, '/');
              onGoToDashboard?.();
            }}
            className="mt-6 bg-blue-600 hover:bg-blue-700"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Ir al dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full border border-slate-700">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
            <ResourceIcon className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="mt-6 text-xl font-bold text-white">
            Te han invitado a colaborar
          </h1>
        </div>

        {/* Resource Info */}
        {inviteInfo?.resource && (
          <div className="mt-6 p-4 bg-slate-700/50 rounded-xl border border-slate-600">
            <p className="text-sm text-slate-400 mb-1">
              {resourceTypeName.charAt(0).toUpperCase() + resourceTypeName.slice(1)}
            </p>
            <p className="text-lg font-semibold text-white">
              {inviteInfo.resource.name}
            </p>
            {inviteInfo.role && (
              <p className="text-sm text-blue-400 mt-2">
                Rol: <span className="capitalize">{inviteInfo.role}</span>
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 space-y-3">
          {isAuthenticated ? (
            <>
              <p className="text-center text-sm text-slate-400 mb-4">
                Conectado como <span className="text-white font-medium">{user?.email || user?.username}</span>
              </p>
              <Button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                data-testid="accept-invite-btn"
              >
                {accepting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    Aceptar invitación
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  window.history.replaceState({}, document.title, '/');
                  window.location.reload();
                }}
                className="w-full text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4 mr-2" />
                Rechazar
              </Button>
            </>
          ) : (
            <>
              <p className="text-center text-sm text-slate-400 mb-4">
                Inicia sesión para aceptar esta invitación
              </p>
              <Button
                onClick={onGoToLogin}
                className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                data-testid="login-to-accept-btn"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar sesión
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  window.history.replaceState({}, document.title, '/');
                  window.location.reload();
                }}
                className="w-full text-slate-400 hover:text-white"
              >
                Volver al inicio
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AcceptInvitePage;
