/**
 * ActivityFeed - Componente de feed de actividad
 * Muestra actividad reciente en workspaces y recursos compartidos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
  Filter,
  X,
  Map,
  LayoutGrid,
  MessageSquare,
  Users,
  Edit3,
  Trash2,
  UserPlus,
  Link2,
  CheckCircle2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../ui/dropdown-menu';

// Use relative URLs for production compatibility
const API_URL = '';

// Íconos para cada tipo de acción
const ACTION_ICONS = {
  created: Edit3,
  edited: Edit3,
  deleted: Trash2,
  shared: Link2,
  invited: UserPlus,
  invite_accepted: Users,
  commented: MessageSquare,
  mentioned: MessageSquare,
  collaborator_added: Users,
  collaborator_removed: Users,
  role_changed: Users,
  task_created: CheckCircle2,
  task_completed: CheckCircle2,
  node_added: Edit3,
  restored: RefreshCw,
};

// Colores para cada tipo de acción
const ACTION_COLORS = {
  created: 'text-green-500',
  edited: 'text-blue-500',
  deleted: 'text-red-500',
  shared: 'text-purple-500',
  invited: 'text-amber-500',
  invite_accepted: 'text-green-500',
  commented: 'text-blue-500',
  mentioned: 'text-amber-500',
  collaborator_added: 'text-green-500',
  collaborator_removed: 'text-red-500',
  role_changed: 'text-purple-500',
  task_created: 'text-blue-500',
  task_completed: 'text-green-500',
};

// Íconos para tipos de recursos
const RESOURCE_ICONS = {
  mindmap: Map,
  board: LayoutGrid,
  contact: Users,
  reminder: Bell,
};

export function ActivityFeed({ 
  workspaceId = null,
  resourceType = null,
  resourceId = null,
  compact = false,
  maxHeight = '400px'
}) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all, comments, collaborations, edits

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('mm_auth_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  }, []);

  // Cargar actividades
  const loadActivities = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams();
      if (workspaceId) params.append('workspace_id', workspaceId);
      if (resourceType) params.append('resource_type', resourceType);
      if (resourceId) params.append('resource_id', resourceId);
      params.append('limit', compact ? '10' : '50');

      const response = await fetch(
        `${API_URL}/api/activity/feed?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) throw new Error('Error loading activities');

      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Error loading activity feed:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [workspaceId, resourceType, resourceId, compact, getAuthHeaders]);

  // Cargar conteo de no leídos
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_URL}/api/activity/unread-count`,
        { headers: getAuthHeaders() }
      );

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(data.unread_count || 0);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    loadActivities();
    loadUnreadCount();
  }, [loadActivities, loadUnreadCount]);

  // Marcar como leídas
  const markAllAsRead = async () => {
    try {
      await fetch(`${API_URL}/api/activity/mark-read`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activity_ids: null }),
      });
      setUnreadCount(0);
      loadActivities(true);
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Filtrar actividades
  const filteredActivities = activities.filter((activity) => {
    if (filter === 'all') return true;
    if (filter === 'comments') return ['commented', 'mentioned'].includes(activity.action);
    if (filter === 'collaborations') return ['invited', 'invite_accepted', 'collaborator_added', 'collaborator_removed', 'role_changed', 'shared'].includes(activity.action);
    if (filter === 'edits') return ['created', 'edited', 'deleted', 'restored', 'node_added', 'task_created', 'task_completed'].includes(activity.action);
    return true;
  });

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 ${compact ? '' : 'shadow-sm'}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-gray-600 dark:text-slate-400" />
          <h3 className="font-semibold text-gray-900 dark:text-white">
            Actividad
          </h3>
          {unreadCount > 0 && (
            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {unreadCount} nuevas
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Filtro */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8">
                <Filter className="w-4 h-4 mr-1" />
                {filter === 'all' ? 'Todas' : 
                 filter === 'comments' ? 'Comentarios' :
                 filter === 'collaborations' ? 'Colaboración' : 'Ediciones'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setFilter('all')}>
                Todas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('comments')}>
                Comentarios
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('collaborations')}>
                Colaboración
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('edits')}>
                Ediciones
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => loadActivities(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </Button>

          {/* Mark all as read */}
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-blue-600 dark:text-blue-400"
              onClick={markAllAsRead}
            >
              <CheckCheck className="w-4 h-4 mr-1" />
              Marcar leídas
            </Button>
          )}
        </div>
      </div>

      {/* Activity List */}
      <ScrollArea style={{ maxHeight }} className="p-2">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-slate-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No hay actividad reciente</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredActivities.map((activity) => {
              const ActionIcon = ACTION_ICONS[activity.action] || Bell;
              const ResourceIcon = RESOURCE_ICONS[activity.resource_type] || Bell;
              const actionColor = ACTION_COLORS[activity.action] || 'text-gray-500';

              return (
                <div
                  key={activity.id}
                  className={`flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors ${
                    !activity.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  data-testid={`activity-item-${activity.id}`}
                >
                  {/* Avatar */}
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarImage src={activity.actor?.picture} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white text-xs">
                      {getInitials(activity.actor?.full_name)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">
                        {activity.actor?.full_name || activity.actor?.username}
                      </span>{' '}
                      <span className="text-gray-600 dark:text-slate-400">
                        {activity.message}
                      </span>
                    </p>

                    <div className="flex items-center gap-2 mt-1">
                      <ActionIcon className={`w-3.5 h-3.5 ${actionColor}`} />
                      <span className="text-xs text-gray-500 dark:text-slate-500">
                        {activity.human_time}
                      </span>
                      {!activity.is_read && (
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>

                  {/* Resource Icon */}
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                      <ResourceIcon className="w-4 h-4 text-gray-500 dark:text-slate-400" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

export default ActivityFeed;
