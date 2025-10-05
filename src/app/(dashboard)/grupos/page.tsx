'use client';
import { Users, Plus, Search, Mail, Loader2 } from 'lucide-react';
import GroupCard from '@/components/grupos/GroupCard';
import GroupCardSkeleton from '@/components/skeletons/GroupCardSkeleton';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import type { User } from '@supabase/supabase-js';

type Group = {
  id: string;
  class_token: string;
  assigned_workshop_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  teacher_id?: string;
};

export default function GruposPage() {
  const { userState, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const fetchPendingCounts = useCallback(async (classTokens: string[]) => {
    // Fetch pending counts en paralelo
    const counts: Record<string, number> = {};
    
    await Promise.all(
      classTokens.map(async (token) => {
        try {
          const response = await fetch(`/api/roster/${token}`);
          if (response.ok) {
            const data = await response.json();
            counts[token] = data.stats?.total_pending || 0;
          }
        } catch (error) {
          console.error(`[fetchPendingCounts] Error for ${token}:`, error);
          counts[token] = 0;
        }
      })
    );

    setPendingCounts(counts);
    console.log('[fetchPendingCounts] Pending counts:', counts);
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('[fetchGroups] Iniciando petición a /api/groups/list');
      const response = await fetch('/api/groups/list');
      console.log('[fetchGroups] Response status:', response.status, response.statusText);
      
      // Manejar diferentes códigos de error
      if (!response.ok) {
        if (response.status === 401) {
          // No autenticado - mostrar mensaje sin redirigir para evitar loop
          console.error('[fetchGroups] Not authenticated (401)');
          setError('Tu sesión expiró. Por favor, cierra e inicia sesión de nuevo.');
          setLoading(false);
          return;
        }
        
        // Otro error del servidor
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[fetchGroups] Server error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch groups');
      }

      const data = await response.json();
      console.log('[fetchGroups] Success! Groups received:', data.groups?.length || 0);
      
      // Si la respuesta es exitosa pero no hay grupos, NO es un error
      const fetchedGroups = data.groups || [];
      setGroups(fetchedGroups);

      // Fetch pending counts para cada grupo
      if (fetchedGroups.length > 0) {
        fetchPendingCounts(fetchedGroups.map((g: Group) => g.class_token));
      }
    } catch (err) {
      console.error('[fetchGroups] Exception:', err);
      // Solo mostrar error si realmente hubo un error del servidor
      setError('Error al cargar los grupos. Por favor, intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  }, [fetchPendingCounts]);

  useEffect(() => {
    console.log('[GruposPage] 🔄 Component mounted - Role:', userState.role);
    
    // Solo cargar grupos cuando auth esté listo y sea docente
    if (!authLoading && userState.role === 'docente') {
      console.log('[GruposPage] 📡 Fetching groups...');
      fetchGroups();
    }
  }, [authLoading, userState.role, fetchGroups]);

  async function handleArchive(classToken: string, newState: boolean) {
    try {
      const response = await fetch('/api/groups/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_token: classToken, is_active: newState }),
      });

      if (!response.ok) {
        throw new Error('Failed to archive group');
      }

      // Refresh groups
      await fetchGroups();
    } catch (err) {
      console.error('Error archiving group:', err);
      alert('Error al archivar el grupo');
    }
  }

  async function handleDelete(classToken: string) {
    try {
      const response = await fetch('/api/groups/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_token: classToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete group');
      }

      // Refresh groups
      await fetchGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      alert('Error al eliminar el grupo');
    }
  }

  async function handleRequestGroup(e: React.FormEvent) {
    e.preventDefault();
    
    if (!groupName.trim()) {
      return;
    }

    try {
      setRequestLoading(true);
      
      const response = await fetch('/api/groups/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupName: groupName.trim() }),
      });

      if (!response.ok) {
        throw new Error('Failed to send request');
      }

      const data = await response.json();
      console.log('[handleRequestGroup] ✅ Request sent:', data);

      // Mostrar éxito
      setRequestSuccess(true);
      setGroupName('');

      // Resetear después de 3 segundos
      setTimeout(() => {
        setRequestSuccess(false);
        setShowRequestModal(false);
      }, 3000);
    } catch (err) {
      console.error('[handleRequestGroup] ❌ Error:', err);
      alert('Error al enviar la solicitud. Por favor, intenta de nuevo.');
    } finally {
      setRequestLoading(false);
    }
  }

  const filteredGroups = groups.filter(g =>
    g.class_token.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.assigned_workshop_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeGroups = filteredGroups.filter(g => g.is_active);
  const archivedGroups = filteredGroups.filter(g => !g.is_active);

  return (
    <>
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-12">
          
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-lime/10 border border-lime/30 text-lime text-xs md:text-sm font-medium mb-3">
                <Users className="w-4 h-4" />
                Centro de Grupos
              </div>
              <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-white via-neutral-200 to-neutral-400 bg-clip-text text-transparent mb-2">
                Gestiona tus Grupos
              </h1>
              <p className="text-sm md:text-base text-neutral-400">
                Administra tus clases y monitorea el progreso de tus estudiantes.
              </p>
            </div>

            {/* Botón Crear Grupo */}
            <button
              onClick={() => setShowRequestModal(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-turquoise hover:bg-turquoise/90 text-black font-medium rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Crear Nuevo Grupo</span>
              <span className="md:hidden">Nuevo</span>
            </button>
          </div>

          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
              <input
                type="text"
                placeholder="Buscar por código o taller..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-neutral-900/50 border border-neutral-800 rounded-xl text-white placeholder:text-neutral-500 focus:outline-none focus:border-turquoise/50 transition-colors"
              />
            </div>
          </div>

          {/* Loading State - Skeletons */}
          {loading && (
            <div>
              <div className="h-6 bg-neutral-800 rounded w-40 mb-4 animate-pulse"></div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                <GroupCardSkeleton />
                <GroupCardSkeleton />
                <GroupCardSkeleton />
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-xl p-6 text-center">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {/* Empty State - Sin grupos */}
          {!loading && !error && groups.length === 0 && (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-neutral-600 mx-auto mb-6" />
              <p className="text-lg text-neutral-400 mb-8">
                Aún no tienes grupos creados
              </p>
              <button
                onClick={() => setShowRequestModal(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-turquoise hover:bg-turquoise/90 text-black font-medium rounded-xl transition-colors"
              >
                <Plus className="w-4 h-4" />
                Crear tu Primer Grupo
              </button>
            </div>
          )}

          {/* Active Groups */}
          {!loading && !error && activeGroups.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">
                Grupos Activos ({activeGroups.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    classToken={group.class_token}
                    workshopId={group.assigned_workshop_id}
                    isActive={group.is_active}
                    createdAt={group.created_at}
                    pendingCount={pendingCounts[group.class_token] || 0}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Archived Groups */}
          {!loading && !error && archivedGroups.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-neutral-400 mb-4">
                Grupos Archivados ({archivedGroups.length})
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {archivedGroups.map((group) => (
                  <GroupCard
                    key={group.id}
                    classToken={group.class_token}
                    workshopId={group.assigned_workshop_id}
                    isActive={group.is_active}
                    createdAt={group.created_at}
                    pendingCount={pendingCounts[group.class_token] || 0}
                    onArchive={handleArchive}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
    </div>

    {/* Modal de Solicitud de Grupo */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <motion.div
            className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 md:p-8 max-w-md w-full"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            {requestSuccess ? (
              // Estado de éxito
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-lime/20 border border-lime/30 mb-4">
                  <svg className="w-8 h-8 text-lime" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Solicitud Enviada!</h3>
                <p className="text-neutral-400">
                  Te notificaremos cuando tu grupo esté listo.
                </p>
              </div>
            ) : (
              // Formulario
              <form onSubmit={handleRequestGroup}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-turquoise/20">
                    <Plus className="w-6 h-6 text-turquoise" />
                  </div>
                  <h3 className="text-xl font-bold text-white">Solicitar Nuevo Grupo</h3>
                </div>
                
                <p className="text-neutral-300 mb-6">
                  Ingresa el nombre de tu grupo y te notificaremos cuando esté listo para usar.
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-neutral-300 mb-2">
                    Nombre del Grupo
                  </label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Ej: Programación 101"
                    className="w-full bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-turquoise focus:border-transparent transition-all"
                    required
                    disabled={requestLoading}
                    autoFocus
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestModal(false);
                      setGroupName('');
                    }}
                    disabled={requestLoading}
                    className="flex-1 px-4 py-3 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={requestLoading || !groupName.trim()}
                    className="flex-1 px-4 py-3 bg-turquoise hover:bg-turquoise/90 disabled:opacity-50 disabled:cursor-not-allowed text-black font-medium rounded-xl transition-colors inline-flex items-center justify-center gap-2"
                  >
                    {requestLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar Solicitud'
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      )}
    </>
  );
}
