/**
 * MANAGED ROSTER SYSTEM - Tipos TypeScript
 * 
 * Define los tipos para el sistema de roster gestionado
 * donde docentes aprueban estudiantes antes de dar acceso.
 */

export type RosterStatus = 'pending' | 'approved' | 'rejected';

export interface StudentRosterEntry {
  id: number;
  created_at: string;
  updated_at: string;
  class_token: string;
  teacher_id: string;
  student_alias: string;
  student_session_id: string | null;
  status: RosterStatus;
  approved_at: string | null;
  rejected_at: string | null;
}

export interface PendingRequest {
  id: number;
  student_alias: string;
  created_at: string;
}

// ApprovedStudent es simplemente un StudentRosterEntry con status approved
export type ApprovedStudent = StudentRosterEntry & {
  last_seen?: string;  // Campo adicional de alias_sessions si existe
};

export interface RosterStats {
  total_approved: number;
  total_pending: number;
  total_rejected: number;
}
