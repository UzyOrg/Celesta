# Refactorización: Modelo Centrado en Docente

## Contenido

- **Arquitectura**
- **Migraciones SQL**
- **Backend / Server Actions**
- **Frontend**
- **Pendientes y riesgos**

## Arquitectura

- **Anterior:** `class_assignments.assigned_workshop_id` vinculaba 1 grupo → 1 taller.
- **Actual:**
  ```text
  teachers → docente_biblioteca ← talleres
                  ↓
           class_assignments ← grupo_talleres → talleres
  ```
- Beneficios: biblioteca personal por docente, múltiples talleres por grupo, preparado para compartir talleres.

## Migraciones SQL

- `supabase/migrations/20250108_refactor_teacher_centric_up.sql`
  - Tablas nuevas: `talleres`, `docente_biblioteca`, `grupo_talleres`.
  - RLS habilitado con políticas para owner/teacher.
  - Triggers: auto-agregar a biblioteca (`fn_add_owner_taller_to_library`) y `updated_at`.
  - Script de migración de datos desde `assigned_workshop_id`.
- `supabase/migrations/20250108_refactor_teacher_centric_down.sql`
  - Restaura columna `assigned_workshop_id` y elimina tablas nuevas.

## Backend / Server Actions

- Tipos en `src/types/biblioteca.ts`.
- Supabase helpers en `src/lib/supabase/biblioteca.ts` (CRUD de talleres, biblioteca, asignaciones).
- Server actions:
  - Biblioteca: `src/app/(dashboard)/biblioteca/actions.ts`.
  - Grupos: `src/app/(dashboard)/grupos/[groupId]/actions.ts`.
- API routes ajustadas:
  - `src/app/api/library/route.ts`.
  - `src/app/api/groups/list/route.ts` (incluye `talleres_count`).
  - `src/app/api/groups/create/route.ts` (ya no requiere workshop).
  - `src/app/api/assignments/get-workshop/route.ts` (usa `grupo_talleres`).
  - `src/app/api/groups/request/route.ts` (texto actualizado para asignar desde biblioteca).

## Frontend

- Modal de asignación: `src/components/grupos/AssignWorkshopsModal.tsx`.
- Página de grupos `src/app/(dashboard)/grupos/page.tsx` y `GroupCard` muestran conteo de talleres.

## Pendientes / Riesgos

- Verificar manualmente modal y flujo de asignación en UI.
- Confirmar que `sendNotification` en `src/app/api/groups/request/route.ts` quede sin conflictos.
- Considerar borrar `class_assignments.assigned_workshop_id` tras verificar migración.
- Implementar UI para listar/remover talleres en vista de grupo.
