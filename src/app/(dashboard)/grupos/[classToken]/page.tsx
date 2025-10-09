'use client';
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2, ArrowLeft, Check, LinkIcon as Link, Plus } from 'lucide-react';
import PageContainer from '@/components/shell/PageContainer';
import { getCsrfTokenFromBrowser } from '@/lib/csrf';
import PendingRequestsList from '@/components/grupos/PendingRequestsList';
import ApprovedStudentsList from '@/components/grupos/ApprovedStudentsList';
import StudentInsightModal from '@/components/insights/StudentInsightModal';
import AnalyticsDashboardWrapper from '@/components/grupos/AnalyticsDashboardWrapper';
import AssignWorkshopsModal from '@/components/grupos/AssignWorkshopsModal';
import WorkshopList from './_components/WorkshopList';
import type { StudentRosterEntry, RosterStats, ApprovedStudent } from '@/types/roster';

const LinkIcon = Link;

type Tab = 'approved' | 'pending' | 'dashboard' | 'talleres';

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
  
  // Student Insight Modal state
  const [selectedStudent, setSelectedStudent] = useState<ApprovedStudent | null>(null);
  const [isInsightModalOpen, setIsInsightModalOpen] = useState(false);
  
  // Talleres state
  const [workshops, setWorkshops] = useState<any[]>([]);
  const [groupId, setGroupId] = useState<string | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  // Fetch roster data and group info
  useEffect(() => {
    if (!classToken) return;

    async function fetchData() {
      try {
        // Fetch roster
        const rosterResponse = await fetch(`/api/roster/${classToken}`);
        if (rosterResponse.ok) {
          const data = await rosterResponse.json();
          setApprovedStudents(data.approved || []);
          setpendingRequests(data.pending || []);
          setStats(data.stats || { total_approved: 0, total_pending: 0, total_rejected: 0 });
        }

        // Fetch group info to get group_id
        const groupResponse = await fetch(`/api/groups/by-token?token=${classToken}`);
        console.log('[GrupoDetail] Group response:', groupResponse.status);
        
        if (groupResponse.ok) {
          const groupData = await groupResponse.json();
          console.log('[GrupoDetail] Group data:', groupData);
          setGroupId(groupData.group.id);
          
          // Fetch workshops for this group
          const workshopsResponse = await fetch(`/api/groups/${groupData.group.id}/talleres`);
          console.log('[GrupoDetail] Workshops response:', workshopsResponse.status);
          
          if (workshopsResponse.ok) {
            const workshopsData = await workshopsResponse.json();
            console.log('[GrupoDetail] Workshops data:', workshopsData);
            setWorkshops(workshopsData.talleres || []);
          }
        } else {
          console.error('[GrupoDetail] Failed to fetch group:', await groupResponse.text());
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [classToken]);

  const handleCopyInviteLink = () => {
    const inviteUrl = `${window.location.origin}/join?t=${classToken}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleStudentClick = (student: ApprovedStudent) => {
    setSelectedStudent(student);
    setIsInsightModalOpen(true);
  };

  const handleCloseInsightModal = () => {
    setIsInsightModalOpen(false);
    setSelectedStudent(null);
  };

  const handleApprove = async (requestId: number) => {
    try {
      // Obtener CSRF token de la cookie
      const csrfToken = getCsrfTokenFromBrowser() || '';
      
      const response = await fetch('/api/roster/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ request_id: requestId, class_token: classToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error aprobando solicitud:', errorData);
        alert(errorData.message || 'Error al aprobar la solicitud');
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
      // Obtener CSRF token de la cookie
      const csrfToken = getCsrfTokenFromBrowser() || '';
      
      const response = await fetch('/api/roster/reject', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ request_id: requestId, class_token: classToken }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error rechazando solicitud:', errorData);
        alert(errorData.message || 'Error al rechazar la solicitud');
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
        <div className="flex items-center justify-center py-12 md:py-20">
          <Loader2 className="w-6 h-6 md:w-8 md:h-8 text-crystal-blue animate-spin" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title={classToken} subtitle="Gestión de estudiantes" maxWidth="6xl">
      {/* Header */}
      <div className="mb-6 md:mb-8 space-y-4 md:space-y-6">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 md:gap-2 text-neutral-400 hover:text-white transition"
        >
          <ArrowLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
          <span className="text-xs md:text-sm">Volver a Grupos</span>
        </button>

        {/* Invite Link */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 p-4 md:p-6 bg-neutral-900/50 backdrop-blur-sm border border-neutral-800/50 rounded-lg md:rounded-xl">
          <div>
            <h3 className="text-sm md:text-base font-semibold text-white mb-1">Enlace de Invitación</h3>
            <p className="text-xs md:text-sm text-neutral-300">
              Comparte este enlace con tus estudiantes para que soliciten unirse
            </p>
          </div>
          <button
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 md:gap-2 px-4 md:px-6 min-h-[48px] bg-gradient-to-r from-crystal-blue to-crystal-lavender text-black text-xs md:text-sm font-semibold rounded-lg hover:opacity-90 transition whitespace-nowrap"
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
        <div className="grid grid-cols-3 gap-2 md:gap-4">
          <div className="bg-neutral-900/30 rounded-lg p-3 md:p-4 border border-neutral-800/30">
            <p className="text-xl md:text-2xl font-bold text-crystal-lavender">{stats.total_approved}</p>
            <p className="text-[10px] md:text-xs text-neutral-400">Aprobados</p>
          </div>
          <div className="bg-neutral-900/30 rounded-lg p-3 md:p-4 border border-amber-800/30">
            <p className="text-xl md:text-2xl font-bold text-amber-400">{stats.total_pending}</p>
            <p className="text-[10px] md:text-xs text-neutral-400">Pendientes</p>
          </div>
          <div className="bg-neutral-900/30 rounded-lg p-3 md:p-4 border border-neutral-800/30">
            <p className="text-xl md:text-2xl font-bold text-red-400">{stats.total_rejected}</p>
            <p className="text-[10px] md:text-xs text-neutral-400">Rechazados</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 md:mb-6 flex gap-1 md:gap-2 border-b border-neutral-800 overflow-x-auto">
        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-all relative whitespace-nowrap ${
            activeTab === 'approved'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Estudiantes Aprobados ({stats.total_approved})
          {activeTab === 'approved' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-crystal-blue"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-all relative whitespace-nowrap ${
            activeTab === 'pending'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Solicitudes Pendientes ({stats.total_pending})
          {activeTab === 'pending' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-crystal-blue"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-all relative whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Dashboard
          {activeTab === 'dashboard' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-crystal-blue"
            />
          )}
        </button>
        <button
          onClick={() => setActiveTab('talleres')}
          className={`px-4 md:px-6 py-2.5 md:py-3 text-xs md:text-sm font-medium transition-all relative whitespace-nowrap ${
            activeTab === 'talleres'
              ? 'text-white'
              : 'text-neutral-500 hover:text-neutral-300'
          }`}
        >
          Talleres ({workshops.length})
          {activeTab === 'talleres' && (
            <motion.div
              layoutId="tab-indicator"
              className="absolute bottom-0 left-0 right-0 h-0.5 bg-crystal-blue"
            />
          )}
        </button>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'approved' && (
          <ApprovedStudentsList 
            students={approvedStudents}
            onStudentClick={handleStudentClick}
          />
        )}
        {activeTab === 'pending' && (
          <PendingRequestsList
            requests={pendingRequests}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}
        {activeTab === 'talleres' && groupId && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-bold text-white">Talleres Asignados</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  Gestiona los talleres pedagógicos de este grupo
                </p>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-turquoise to-lime text-black font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                <Plus className="w-4 h-4" />
                Añadir Taller
              </button>
            </div>
            <WorkshopList workshops={workshops} groupId={groupId} />
          </div>
        )}
        {activeTab === 'dashboard' && (
          <AnalyticsDashboardWrapper classToken={classToken} />
        )}
      </div>

      {/* Student Insight Modal */}
      {selectedStudent && (
        <StudentInsightModal
          isOpen={isInsightModalOpen}
          onClose={handleCloseInsightModal}
          studentAlias={selectedStudent.student_alias}
          classToken={classToken}
        />
      )}

      {/* Assign Workshops Modal */}
      {groupId && (
        <AssignWorkshopsModal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          groupId={groupId}
          assignedTallerIds={workshops.map(w => w.taller_id)}
          onSuccess={() => {
            // Refresh workshops
            fetch(`/api/groups/${groupId}/talleres`)
              .then(res => res.json())
              .then(data => setWorkshops(data.talleres || []))
              .catch(console.error);
          }}
        />
      )}
    </PageContainer>
  );
}
