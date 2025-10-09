// ============================================================================
// TIPOS: Biblioteca y Talleres
// ============================================================================

export interface Taller {
  id: string;
  created_at: string;
  updated_at: string;
  owner_teacher_id: string;
  nombre: string;
  descripcion: string | null;
  contenido_json: Record<string, any>;
  etiquetas: string[];
  es_publico: boolean;
}

export interface DocenteBiblioteca {
  teacher_id: string;
  taller_id: string;
  agregado_en: string;
  notas_personales: string | null;
  talleres?: Taller; // Join con talleres
}

export interface GrupoTaller {
  id: string;
  group_id: string;
  taller_id: string;
  assigned_by_teacher_id: string;
  assigned_at: string;
  position: number;
  configuracion_json: Record<string, any>;
  talleres?: Taller; // Join con talleres
}

// ============================================================================
// DTOs para operaciones
// ============================================================================

export interface CreateTallerInput {
  nombre: string;
  descripcion?: string;
  contenido_json?: Record<string, any>;
  etiquetas?: string[];
  es_publico?: boolean;
}

export interface UpdateTallerInput {
  nombre?: string;
  descripcion?: string;
  contenido_json?: Record<string, any>;
  etiquetas?: string[];
  es_publico?: boolean;
}

export interface AssignTallerInput {
  group_id: string;
  taller_ids: string[];
}

export interface TallerWithStats extends Taller {
  grupos_count: number; // Cuántos grupos usan este taller
  en_biblioteca: boolean; // Si está en la biblioteca del docente actual
}

// ============================================================================
// Respuestas de API
// ============================================================================

export interface BibliotecaResponse {
  items: TallerWithStats[];
  total: number;
  page: number;
  limit: number;
}

export interface GrupoTalleresResponse {
  items: GrupoTaller[];
  total: number;
}
