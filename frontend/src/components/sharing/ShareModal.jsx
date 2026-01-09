/**
 * ShareModal - Modal unificado para compartir recursos
 * Usado para Mind Maps, Boards, Contacts, y Reminders
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Switch } from '../ui/switch';
import { useToast } from '../../hooks/use-toast';
import {
  Users,
  Mail,
  Link2,
  Copy,
  Check,
  X,
  MoreVertical,
  Crown,
  Eye,
  Edit3,
  MessageSquare,
  Shield,
  Loader2,
  UserPlus,
  Globe,
  Lock,
  Trash2,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Configuración de roles
const ROLES = {
  viewer: { label: 'Visualizador', icon: Eye, description: 'Solo puede ver' },
  commenter: { label: 'Comentador', icon: MessageSquare, description: 'Puede comentar' },
  editor: { label: 'Editor', icon: Edit3, description: 'Puede editar' },
  admin: { label: 'Administrador', icon: Shield, description: 'Control total' },
};

// Nombres de tipos de recursos
const RESOURCE_TYPE_NAMES = {
  mindmap: 'mapa mental',
  board: 'tablero',
  contacts: 'contactos',
  reminders: 'recordatorios',
};

export function ShareModal({ 
  isOpen, 
  onClose, 
  resourceType, 
  resourceId, 
  resourceName,
  onCollaboratorsChange 
}) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [collaborators, setCollaborators] = useState([]);
  const [owner, setOwner] = useState(null);
  const [shareLink, setShareLink] = useState(null);
  const [currentUserIsOwner, setCurrentUserIsOwner] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('viewer');
  const [linkCopied, setLinkCopied] = useState(false);
  const [shareLinkEnabled, setShareLinkEnabled] = useState(false);
  const [shareLinkRole, setShareLinkRole] = useState('viewer');

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('mm_auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Cargar colaboradores
  const loadCollaborators = useCallback(async () => {
    if (!resourceId || !resourceType) return;
    
    setLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/${resourceType}/${resourceId}/collaborators`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Error al cargar colaboradores');

      const data = await response.json();
      setOwner(data.owner);
      setCollaborators(data.collaborators || []);
      setShareLink(data.share_link);
      setCurrentUserIsOwner(data.current_user_is_owner);
      setShareLinkEnabled(data.share_link?.is_active || false);
      setShareLinkRole(data.share_link?.role || 'viewer');
    } catch (error) {
      console.error('Error loading collaborators:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los colaboradores',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [resourceId, resourceType, getAuthHeaders, toast]);

  useEffect(() => {
    if (isOpen) {
      loadCollaborators();
    }
  }, [isOpen, loadCollaborators]);

  // Enviar invitación
  const handleInvite = async (e) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa un correo electrónico',
        variant: 'destructive',
      });
      return;
    }

    setInviteLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/invites`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          resource_type: resourceType,
          resource_id: resourceId,
          role: inviteRole,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al enviar invitación');
      }

      toast({
        title: '¡Invitación enviada!',
        description: `Se ha enviado una invitación a ${inviteEmail}`,
      });

      setInviteEmail('');
      loadCollaborators();
      onCollaboratorsChange?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Actualizar rol de colaborador
  const handleUpdateRole = async (username, newRole) => {
    try {
      const response = await fetch(
        `${API_URL}/api/${resourceType}/${resourceId}/collaborators/${username}`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ role: newRole }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al actualizar rol');
      }

      toast({
        title: 'Rol actualizado',
        description: 'El rol del colaborador ha sido actualizado',
      });

      loadCollaborators();
      onCollaboratorsChange?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Remover colaborador
  const handleRemoveCollaborator = async (username) => {
    try {
      const response = await fetch(
        `${API_URL}/api/${resourceType}/${resourceId}/collaborators/${username}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Error al remover colaborador');
      }

      toast({
        title: 'Colaborador removido',
        description: 'El colaborador ha sido removido del recurso',
      });

      loadCollaborators();
      onCollaboratorsChange?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Cancelar invitación pendiente
  const handleCancelInvite = async (inviteId) => {
    try {
      const response = await fetch(`${API_URL}/api/invites/${inviteId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) throw new Error('Error al cancelar invitación');

      toast({
        title: 'Invitación cancelada',
      });

      loadCollaborators();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Crear/actualizar link de compartir
  const handleToggleShareLink = async (enabled) => {
    try {
      if (enabled && !shareLink) {
        // Crear link
        const response = await fetch(
          `${API_URL}/api/${resourceType}/${resourceId}/share-link`,
          {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
              resource_type: resourceType,
              resource_id: resourceId,
              role: shareLinkRole,
            }),
          }
        );

        if (!response.ok) throw new Error('Error al crear link');

        const data = await response.json();
        setShareLink(data.share_link);
        setShareLinkEnabled(true);
      } else {
        // Toggle existing link
        const response = await fetch(
          `${API_URL}/api/${resourceType}/${resourceId}/share-link`,
          {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify({ is_active: enabled }),
          }
        );

        if (!response.ok) throw new Error('Error al actualizar link');

        setShareLinkEnabled(enabled);
        if (shareLink) {
          setShareLink({ ...shareLink, is_active: enabled });
        }
      }

      toast({
        title: enabled ? 'Link activado' : 'Link desactivado',
        description: enabled
          ? 'Cualquiera con el link puede acceder'
          : 'El link ya no está activo',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  // Copiar link al portapapeles
  const copyShareLink = async () => {
    if (!shareLink?.token) return;

    const link = `${window.location.origin}/shared/${shareLink.token}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      
      toast({
        title: 'Link copiado',
        description: 'El link ha sido copiado al portapapeles',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo copiar el link',
        variant: 'destructive',
      });
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const resourceTypeDisplay = RESOURCE_TYPE_NAMES[resourceType] || resourceType;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-[500px] bg-slate-900 border-slate-700 text-white"
        data-testid="share-modal"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Users className="w-5 h-5 text-blue-400" />
            Compartir {resourceTypeDisplay}
          </DialogTitle>
          {resourceName && (
            <p className="text-sm text-slate-400 truncate">{resourceName}</p>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Formulario de invitación */}
            <form onSubmit={handleInvite} className="space-y-3">
              <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Invitar por correo
              </label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                  data-testid="share-email-input"
                />
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="w-[140px] bg-slate-800 border-slate-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {Object.entries(ROLES).map(([key, role]) => (
                      <SelectItem 
                        key={key} 
                        value={key}
                        className="text-white hover:bg-slate-700"
                      >
                        <span className="flex items-center gap-2">
                          <role.icon className="w-3 h-3" />
                          {role.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={inviteLoading || !inviteEmail.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700"
                data-testid="share-send-invite-btn"
              >
                {inviteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Enviar invitación
              </Button>
            </form>

            {/* Link de compartir */}
            {currentUserIsOwner && (
              <div className="space-y-3 pt-4 border-t border-slate-700">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    {shareLinkEnabled ? (
                      <Globe className="w-4 h-4 text-green-400" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Link público
                  </label>
                  <Switch
                    checked={shareLinkEnabled}
                    onCheckedChange={handleToggleShareLink}
                    data-testid="share-link-toggle"
                  />
                </div>

                {shareLinkEnabled && shareLink && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={`${window.location.origin}/shared/${shareLink.token}`}
                        readOnly
                        className="flex-1 bg-slate-800 border-slate-600 text-slate-300 text-sm"
                      />
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={copyShareLink}
                        className="border-slate-600 hover:bg-slate-700"
                        data-testid="share-copy-link-btn"
                      >
                        {linkCopied ? (
                          <Check className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-slate-500">
                      Cualquiera con el link puede ver este {resourceTypeDisplay}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Lista de colaboradores */}
            <div className="space-y-3 pt-4 border-t border-slate-700">
              <label className="text-sm font-medium text-slate-300">
                Personas con acceso
              </label>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {/* Owner */}
                {owner && (
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={owner.picture} />
                        <AvatarFallback className="bg-blue-600 text-xs">
                          {getInitials(owner.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {owner.full_name}
                        </p>
                        <p className="text-xs text-slate-400">{owner.email}</p>
                      </div>
                    </div>
                    <Badge className="bg-amber-600/20 text-amber-400 border-amber-500/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Propietario
                    </Badge>
                  </div>
                )}

                {/* Colaboradores activos */}
                {collaborators
                  .filter((c) => c.status !== 'pending')
                  .map((collaborator) => (
                    <div
                      key={collaborator.username || collaborator.email}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={collaborator.picture} />
                          <AvatarFallback className="bg-slate-600 text-xs">
                            {getInitials(collaborator.full_name || collaborator.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-white">
                            {collaborator.full_name || collaborator.email}
                          </p>
                          <p className="text-xs text-slate-400">
                            {collaborator.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {currentUserIsOwner ? (
                          <>
                            <Select
                              value={collaborator.role}
                              onValueChange={(value) =>
                                handleUpdateRole(collaborator.username, value)
                              }
                            >
                              <SelectTrigger className="w-[120px] h-8 bg-slate-700 border-slate-600 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-slate-600">
                                {Object.entries(ROLES).map(([key, role]) => (
                                  <SelectItem
                                    key={key}
                                    value={key}
                                    className="text-white hover:bg-slate-700 text-xs"
                                  >
                                    {role.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-red-900/20"
                              onClick={() =>
                                handleRemoveCollaborator(collaborator.username)
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <Badge variant="outline" className="text-xs border-slate-600">
                            {ROLES[collaborator.role]?.label || collaborator.role}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}

                {/* Invitaciones pendientes */}
                {collaborators
                  .filter((c) => c.status === 'pending')
                  .map((invite) => (
                    <div
                      key={invite.email}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-800/30 border border-dashed border-slate-600"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="bg-slate-700 text-xs">
                            <Mail className="w-4 h-4 text-slate-400" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm text-slate-300">{invite.email}</p>
                          <p className="text-xs text-slate-500">
                            Invitación pendiente
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="text-xs border-yellow-500/30 text-yellow-400"
                        >
                          {ROLES[invite.role]?.label || invite.role}
                        </Badge>
                        {currentUserIsOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-400"
                            onClick={() => handleCancelInvite(invite.id)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}

                {!owner && collaborators.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    Aún no has compartido este {resourceTypeDisplay} con nadie
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ShareModal;
