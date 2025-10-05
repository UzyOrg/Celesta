'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Link as LinkIcon, Check, Loader2 } from 'lucide-react';
import PageContainer from '@/components/shell/PageContainer';
import PendingRequestsList from '@/components/grupos/PendingRequestsList';
import ApprovedStudentsList from '@/components/grupos/ApprovedStudentsList';
import type { StudentRosterEntry, RosterStats } from '@/types/roster';

type Tab = 'approved' | 'pending';

export default function GrupoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classToken = params?.classToken as string;

  const [activeTab, setActiveTab] = useState<Tab>('approved');
  const [loading, setLoading] = useState(true);
  const [approvedStudents, setApprovedStudents] = useState<StudentRosterEntry[]>([]);
  const [pendingRequests, setpendingRequests] = useState<StudentRosterEntry[]>([]);
  const [stats, setStats] = useState<RosterStats>({ total_approved: 0, total_pending: 0, total_rejected: 0 });
  const [copiedLink, setCopiedLink] = useState(false);

  // Fetch roster data
  useEffect(() => {
    if (!classToken) return;

    async function fetchRoster() {
      try {
        const response = await fetch(`/api/roster/${classToken}`);
        if (!response.ok) {
          console.error('Error fetching roster:', response.statusText);
          return;
        }

        const data = await response.json();
        setApprovedStudents(data.approved || []);
        setpendingRequests(data.pending || []);
        setStats(data.stats || { total_approved: 0, total_pending: 0, total_rejected: 0 });
      } catch (error) {
        console.error('Error fetching roster:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchRoster();
  }, [classToken]);

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join?t=${classToken}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleApprove = async (requestId: number) => {
    try {
      const response = await fetch('/api/roster/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, class_token: classToken }),
      });

      if (!response.ok) {
        console.error('Error aprobando solicitud');
        return;
      }

      // Refrescar roster
      const rosterResponse = await fetch(`/api/roster/${classToken}`);
      const data = await rosterResponse.json();
      setApprovedStudents(data.approved || []);
      setpendingRequests(data.pending || []);
      setStats(data.stats || { total_approved: 0, total_pending: 0, total_rejected: 0 });
    } catch (error) {
      console.error('Error aprobando solicitud:', error);
    }
  };

  const handleReject = async (requestId: number) => {
    try {
      const response = await fetch('/api/roster/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request_id: requestId, class_token: classToken }),
      });

      if (!response.ok) {
        console.error('Error rechazando solicitud');
        return;
      }

      // Refrescar roster
      const rosterResponse = await fetch(`/api/roster/${classToken}`);
      const data = await rosterResponse.json();
      setApprovedStudents(data.approved || []);
      setpendingRequests(data.pending || []);
      setStats(data.stats || { total_approved: 0, total_pending: 0, total_rejected: 0 });
    } catch (error) {
      console.error('Error rechazando solicitud:', error);
    }
  };

  if (loading) {
    return (
      <PageContainer title="Cargando..." subtitle="" maxWidth="6xl">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-turquoise animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={classToken} subtitle="Gestión de estudiantes" maxWidth="6xl">
      {/* Header */}
      <div className="mb-8 space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Volver a Grupos</span>
        </button>

        {/* Invite Link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/50 rounded-xl">
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Enlace de Invitación</h3>
            <p className="text-sm text-neutral-400">
              Comparte este enlace con tus estudiantes para que soliciten unirse
            </p>
          </div>
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-lg hover:opacity-90 transition whitespace-nowrap"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4" />
                ¡Copiado!
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Copiar Enlace
              </>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-neutral-900/30 rounded-lg p-4 border border-neutral-800/30">
            <p className="text-2xl font-bold text-lime">{stats.total_approved}</p>
            <p className="text-sm text-neutral-400">Aprobados</p>
          </div>
          <div className="bg-neutral-900/30 rounded-lg p-4 border border-amber-800/30">
            <p className="text-2xl font-bold text-amber-400">{stats.total_pending}</p>
            <p className="text-sm text-neutral-400">Pendientes</p>
          </div>
          <div className="bg-neutral-900/30 rounded-lg p-4 border border-neutral-800/30">
            <p className="text-2xl font-bold text-red-400">{stats.total_rejected}</p>
            <p className="text-sm text-neutral-400">Rechazados</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2 border-b border-neutral-800">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-6 py-3 font-medium transition-all relative ${
            activeTab === 'approved'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Estudiantes Aprobados ({stats.total_approved})
          {activeTab === 'approved' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-turquoise"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-6 py-3 font-medium transition-all relative ${
            activeTab === 'pending'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Solicitudes Pendientes ({stats.total_pending})
          {activeTab === 'pending' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-turquoise"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'approved' && (
          <ApprovedStudentsList students={approvedStudents} />
        )}
        {activeTab === 'pending' && (
          <PendingRequestsList
            requests={pendingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
      </div>
    </PageContainer>
  );
}
