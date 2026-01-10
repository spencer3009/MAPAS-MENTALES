/**
 * NotificationPreferences - Modal de preferencias de notificación
 * Permite al usuario configurar qué emails recibir
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useToast } from '../../hooks/use-toast';
import {
  Bell,
  Mail,
  MessageSquare,
  Users,
  Edit3,
  Shield,
  CheckCircle,
  Clock,
  Loader2,
  Save,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configuración de preferencias
const NOTIFICATION_OPTIONS = [
  {
    key: 'comments',
    label: 'Comentarios',
    description: 'Cuando alguien comenta en un recurso compartido',
    icon: MessageSquare,
  },
  {
    key: 'mentions',
    label: 'Menciones',
    description: 'Cuando alguien te menciona (@tu_nombre)',
    icon: Users,
  },
  {
    key: 'invitations',
    label: 'Invitaciones',
    description: 'Cuando te invitan a colaborar o alguien acepta tu invitación',
    icon: Mail,
  },
  {
    key: 'permission_changes',
    label: 'Cambios de permisos',
    description: 'Cuando cambian tu rol o te agregan/remueven como colaborador',
    icon: Shield,
  },
  {
    key: 'task_updates',
    label: 'Actualizaciones de tareas',
    description: 'Cuando se crean o completan tareas en tableros compartidos',
    icon: CheckCircle,
  },
  {
    key: 'resource_changes',
    label: 'Ediciones de recursos',
    description: 'Cuando alguien edita un mapa o tablero compartido (puede generar muchos emails)',
    icon: Edit3,
    warning: true,
  },
];

const DIGEST_OPTIONS = [
  { value: 'instant', label: 'Inmediato', description: 'Recibir al momento' },
  { value: 'daily', label: 'Resumen diario', description: 'Un email al día' },
  { value: 'weekly', label: 'Resumen semanal', description: 'Un email por semana' },
  { value: 'none', label: 'Desactivado', description: 'No recibir emails' },
];

export function NotificationPreferences({ isOpen, onClose }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email_enabled: true,
    email_digest: 'instant',
    notify_on: {
      comments: true,
      mentions: true,
      invitations: true,
      permission_changes: true,
      task_updates: true,
      resource_changes: false,
    },
  });

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('mm_auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Cargar preferencias
  const loadPreferences = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/user/notification-preferences`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setPreferences({
          email_enabled: data.email_enabled ?? true,
          email_digest: data.email_digest || 'instant',
          notify_on: {
            comments: data.notify_on?.comments ?? true,
            mentions: data.notify_on?.mentions ?? true,
            invitations: data.notify_on?.invitations ?? true,
            permission_changes: data.notify_on?.permission_changes ?? true,
            task_updates: data.notify_on?.task_updates ?? true,
            resource_changes: data.notify_on?.resource_changes ?? false,
          },
        });
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    if (isOpen) {
      loadPreferences();
    }
  }, [isOpen, loadPreferences]);

  // Guardar preferencias
  const savePreferences = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        `${API_URL}/api/user/notification-preferences`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(preferences),
        }
      );

      if (!response.ok) throw new Error('Error saving preferences');

      toast({
        title: 'Preferencias guardadas',
        description: 'Tus preferencias de notificación han sido actualizadas.',
      });

      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron guardar las preferencias',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  // Toggle individual option
  const toggleOption = (key) => {
    setPreferences((prev) => ({
      ...prev,
      notify_on: {
        ...prev.notify_on,
        [key]: !prev.notify_on[key],
      },
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"
        data-testid="notification-preferences-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-white">
            <Bell className="w-5 h-5 text-blue-500" />
            Preferencias de notificación
          </DialogTitle>
          <DialogDescription className="text-gray-500 dark:text-slate-400">
            Configura qué notificaciones quieres recibir por email
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {/* Email Toggle Global */}
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500 dark:text-slate-400" />
                <div>
                  <Label className="text-sm font-medium text-gray-900 dark:text-white">
                    Notificaciones por email
                  </Label>
                  <p className="text-xs text-gray-500 dark:text-slate-400">
                    Activar o desactivar todos los emails
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences.email_enabled}
                onCheckedChange={(checked) =>
                  setPreferences((prev) => ({ ...prev, email_enabled: checked }))
                }
                data-testid="email-enabled-toggle"
              />
            </div>

            {/* Frecuencia */}
            {preferences.email_enabled && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Frecuencia de emails
                </Label>
                <Select
                  value={preferences.email_digest}
                  onValueChange={(value) =>
                    setPreferences((prev) => ({ ...prev, email_digest: value }))
                  }
                >
                  <SelectTrigger className="w-full bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    {DIGEST_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="cursor-pointer"
                      >
                        <div className="flex flex-col">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-xs text-gray-500 dark:text-slate-400">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Opciones individuales */}
            {preferences.email_enabled && preferences.email_digest !== 'none' && (
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-700 dark:text-slate-300">
                  Notificarme cuando:
                </Label>
                <div className="space-y-2">
                  {NOTIFICATION_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <div
                        key={option.key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          preferences.notify_on[option.key]
                            ? 'border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Icon
                            className={`w-4 h-4 ${
                              preferences.notify_on[option.key]
                                ? 'text-blue-500'
                                : 'text-gray-400 dark:text-slate-500'
                            }`}
                          />
                          <div>
                            <Label className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                              {option.label}
                            </Label>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                              {option.description}
                            </p>
                            {option.warning && (
                              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                ⚠️ Puede generar muchos emails
                              </p>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={preferences.notify_on[option.key]}
                          onCheckedChange={() => toggleOption(option.key)}
                          data-testid={`notify-${option.key}-toggle`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-slate-700">
              <Button
                variant="outline"
                className="flex-1"
                onClick={onClose}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                onClick={savePreferences}
                disabled={saving}
                data-testid="save-preferences-btn"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default NotificationPreferences;
