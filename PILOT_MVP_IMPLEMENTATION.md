# Pilot MVP Implementation - Sistema Operacional

## 🎯 Objetivo

Transformar Celestea de un "demo espectacular" a un sistema operacional listo para piloto real, eliminando hardcoding y construyendo la infraestructura backend necesaria para gestionar múltiples grupos y talleres.

---

## 📋 FASE 1: Sistema de Asignación Dinámica (La Torre de Control)

### ✅ Infraestructura en Supabase

**Archivo:** `lib/supabase/migrations/prd-class-assignments.sql`

Tabla `class_assignments`:
- `id` (uuid, PK)
- `class_token` (text, unique)
- `assigned_workshop_id` (text)
- `is_active` (boolean)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

**Features:**
- Row Level Security (RLS) habilitado
- Policy de lectura pública para asignaciones activas
- Índices en `class_token` y `is_active`
- Datos demo iniciales: `DEMO-101` → `cell-mystery`

### ✅ API Backend

**Endpoint:** `GET /api/assignments/get-workshop?class_token=XXXX`

**Archivo:** `src/app/api/assignments/get-workshop/route.ts`

**Response:**
```json
{
  "workshop_id": "cell-mystery",
  "class_token": "DEMO-101"
}
```

**Manejo de errores:**
- 400: Missing class_token
- 404: No active assignment found
- 500: Database error

### ✅ Frontend Refactorizado

**Archivo:** `src/app/demo/student/page.tsx`

**Cambios:**
- Eliminado hardcoding de `BIO-001` y `DEV-TEST`
- Función `getAssignedWorkshop()` que llama al endpoint dinámicamente
- Fallback a `cell-mystery` si no hay asignación
- Soporte para múltiples talleres por class_token

**Flujo:**
1. Usuario accede a `/demo/student?t=GRUPO-123`
2. Server-side fetch a `/api/assignments/get-workshop?class_token=GRUPO-123`
3. Respuesta con `workshop_id` asignado
4. Se carga dinámicamente el taller correcto

---

## 📋 FASE 2: Centro de Grupos del Docente (El Volante)

### ✅ Componente GroupCard

**Archivo:** `src/components/grupos/GroupCard.tsx`

**Features:**
- Tarjeta responsive con información del grupo
- Menú de acciones (3 puntos) con:
  - Ver Dashboard (`/teacher/[token]`)
  - Archivar/Restaurar Grupo
  - Eliminar Grupo (con confirmación)
- Estados visuales: Activo (verde lime) vs Archivado (gris)
- Loading states durante operaciones
- Animaciones fluidas con Framer Motion

### ✅ Página de Grupos Refactorizada

**Archivo:** `src/app/grupos/page.tsx`

**Features:**
- Lista dinámica de grupos desde API
- Barra de búsqueda por código o taller
- Botón "Crear Nuevo Grupo" (mailto a soporte@celestea.ai)
- Separación de grupos activos vs archivados
- Estados: Loading, Error, Empty, Success
- Grid responsive: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)

**Estados UI:**
- **Loading:** Spinner con mensaje "Cargando grupos..."
- **Empty:** CTA para solicitar primer grupo
- **Success:** Grids de grupos activos y archivados

### ✅ API de Gestión de Grupos

**Endpoints creados:**

1. **`GET /api/groups/list`**
   - Lista todos los grupos
   - Ordenados por `created_at` desc
   - Archivo: `src/app/api/groups/list/route.ts`

2. **`POST /api/groups/archive`**
   - Actualiza `is_active` de un grupo
   - Body: `{ class_token, is_active }`
   - Archivo: `src/app/api/groups/archive/route.ts`

3. **`DELETE /api/groups/delete`**
   - Elimina un grupo permanentemente
   - Body: `{ class_token }`
   - Archivo: `src/app/api/groups/delete/route.ts`

### ✅ Navegación Actualizada

**Archivo:** `src/components/shell/AppShell.tsx`

**Cambios en navegación del docente:**
- ✅ Eliminado: Link "Dashboard" hardcodeado
- ✅ Eliminado: Pestaña "Misiones" (solo para estudiantes)
- ✅ Nuevo: "Mis Grupos" como primer link → `/grupos`
- ✅ Mantenido: Biblioteca y Configuración

**Nueva estructura:**
```
Docente:
  - Mis Grupos (/grupos)
  - Biblioteca (/biblioteca)
  - Configuración (/settings)

Estudiante:
  - Dashboard (/dashboard)
  - Misiones (/missions)
  - Biblioteca (/biblioteca)
  - Configuración (/settings)
```

---

## 📋 FASE 3: Gestión de Sesión (El Profesionalismo)

### ✅ Menú de Perfil con Popover

**Archivo:** `src/components/shell/AppShell.tsx`

**Features:**
- Área de perfil ahora es un botón clickeable
- Popover flotante que aparece encima del perfil
- Diseño inspirado en Rappi/ChatGPT
- Animaciones de entrada/salida con Framer Motion

**Contenido del menú:**
1. Header con alias y rol
2. Separador visual
3. Botón "Cerrar Sesión" (rojo, con icono LogOut)

### ✅ Lógica de Logout

**Implementación:**
```typescript
const handleLogout = () => {
  // Borrar todo localStorage con prefijo 'celesta:'
  const keysToDelete: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('celesta:')) {
      keysToDelete.push(key);
    }
  }
  keysToDelete.forEach(key => localStorage.removeItem(key));
  
  // Redirigir a /join
  router.push('/join');
};
```

**Keys limpiadas:**
- `celesta:session_id`
- `celesta:last_teacher_token`
- `celesta:workshop_progress_*`
- `celesta:alias_*`
- Todas las demás con prefijo `celesta:`

---

## 🧪 Plan de Pruebas

### Prueba 1: Flujo de Asignación Dinámica

**Pasos:**
1. Ejecutar migración SQL en Supabase:
   ```bash
   # En Supabase SQL Editor
   -- Ejecutar: lib/supabase/migrations/prd-class-assignments.sql
   ```

2. Crear asignaciones de prueba:
   ```sql
   INSERT INTO public.class_assignments (class_token, assigned_workshop_id, is_active)
   VALUES 
     ('TEST-201', 'cell-mystery', true),
     ('TEST-202', 'dna-replication', true);
   ```

3. Probar acceso:
   - Navegar a `/demo/student?t=TEST-201`
   - Verificar que carga `cell-mystery`
   - Navegar a `/demo/student?t=TEST-202`
   - Verificar que carga `dna-replication`

**Resultado esperado:** ✅ Diferentes talleres para diferentes tokens

### Prueba 2: Centro de Grupos

**Pasos:**
1. Navegar a `/grupos` como docente
2. Verificar que aparecen los grupos de la base de datos
3. Usar barra de búsqueda:
   - Buscar por código: "DEMO"
   - Buscar por taller: "cell"

4. Probar menú de acciones (3 puntos):
   - Click en "Ver Dashboard" → Redirige a `/teacher/DEMO-101`
   - Click en "Archivar Grupo" → Estado cambia a "Archivado"
   - Grupo archivado aparece en sección "Grupos Archivados"
   - Click en "Restaurar Grupo" → Vuelve a "Grupos Activos"
   
5. Probar eliminación:
   - Click en "Eliminar Grupo"
   - Confirmar en el diálogo
   - Grupo desaparece de la lista

**Resultado esperado:** ✅ CRUD completo funcional

### Prueba 3: Navegación del Docente

**Pasos:**
1. Entrar como docente (cualquier ruta `/teacher/*`)
2. Verificar sidebar:
   - ✅ "Mis Grupos" es la primera opción
   - ✅ No existe link "Dashboard"
   - ✅ No existe pestaña "Misiones"
   - ✅ Biblioteca y Configuración presentes

3. Click en "Mis Grupos" → Redirige a `/grupos`

**Resultado esperado:** ✅ Navegación correcta sin hardcoding

### Prueba 4: Menú de Perfil y Logout

**Pasos:**
1. Estando logueado (con alias guardado en localStorage)
2. Click en el área de perfil (abajo de la sidebar)
3. Verificar que aparece popover con:
   - Alias del usuario
   - Rol (Docente/Estudiante)
   - Botón "Cerrar Sesión"

4. Click en "Cerrar Sesión"
5. Verificar:
   - ✅ Se borra todo el localStorage de Celesta
   - ✅ Redirige a `/join`
   - ✅ Si intentas acceder a una ruta protegida, AliasGuard pide alias nuevamente

**Resultado esperado:** ✅ Logout limpia sesión completamente

### Prueba 5: Mobile Responsiveness

**Dispositivos de prueba:**
- iPhone SE (375px)
- iPhone 14 (390px)
- iPad Air (820px)

**Elementos a verificar:**
- ✅ Página /grupos muestra botón "Nuevo" en lugar de "Crear Nuevo Grupo"
- ✅ Grid de tarjetas es 1 columna en móvil
- ✅ Barra de búsqueda ocupa todo el ancho
- ✅ GroupCard es legible y táctil (touch targets >44px)
- ✅ Menú de perfil aparece correctamente

---

## 📦 Archivos Creados/Modificados

### Nuevos Archivos (9)

**Migración:**
- `lib/supabase/migrations/prd-class-assignments.sql`

**API Routes:**
- `src/app/api/assignments/get-workshop/route.ts`
- `src/app/api/groups/list/route.ts`
- `src/app/api/groups/archive/route.ts`
- `src/app/api/groups/delete/route.ts`

**Componentes:**
- `src/components/grupos/GroupCard.tsx`

**Documentación:**
- `PILOT_MVP_IMPLEMENTATION.md` (este archivo)

### Archivos Modificados (3)

**Frontend:**
- `src/app/demo/student/page.tsx` - Asignación dinámica
- `src/app/grupos/page.tsx` - Centro de Grupos funcional
- `src/components/shell/AppShell.tsx` - Navegación + menú de perfil

---

## 🚀 Despliegue

### Pre-requisitos

1. **Ejecutar migración SQL en Supabase:**
   ```sql
   -- En Supabase SQL Editor, ejecutar:
   -- lib/supabase/migrations/prd-class-assignments.sql
   ```

2. **Verificar variable de entorno:**
   ```bash
   NEXT_PUBLIC_SITE_URL=https://tu-dominio.com
   # (En local usa http://localhost:3000)
   ```

### Pasos de Deploy

```bash
# 1. Build del proyecto
pnpm run build

# 2. Verificar que no hay errores de TypeScript
pnpm run type-check

# 3. Deploy a Vercel/producción
git add .
git commit -m "feat(core): build operational pilot MVP

- Dynamic workshop assignment system
- Teacher groups management center  
- Profile menu with session logout
- Updated navigation for teachers"

git push origin main
```

---

## 🎨 Mejoras Futuras (Out of Scope para MVP)

1. **Crear Grupo desde UI:**
   - Formulario inline en lugar de mailto
   - Validación de códigos únicos
   - Selector de talleres disponibles

2. **Asignar Taller desde UI:**
   - Dropdown para cambiar `assigned_workshop_id`
   - Preview del taller antes de asignar

3. **Bulk Operations:**
   - Archivar múltiples grupos
   - Exportar lista de grupos a CSV

4. **Estadísticas en GroupCard:**
   - Número de estudiantes activos
   - Última actividad del grupo
   - Tasa de completitud promedio

5. **Roles y Permisos:**
   - Super Admin vs Teacher
   - RLS policies por usuario

---

## ✅ Checklist de Completitud

- [x] FASE 1: Tabla `class_assignments` creada
- [x] FASE 1: Endpoint `GET /api/assignments/get-workshop`
- [x] FASE 1: Refactor de `/demo/student` para carga dinámica
- [x] FASE 2: Endpoints `/api/groups/*` (list, archive, delete)
- [x] FASE 2: Componente `GroupCard` con menú de acciones
- [x] FASE 2: Página `/grupos` refactorizada y funcional
- [x] FASE 2: Navegación del docente actualizada
- [x] FASE 3: Menú de perfil con popover
- [x] FASE 3: Lógica de logout (limpia localStorage)
- [x] Documentación completa
- [x] Plan de pruebas detallado

---

## 📞 Soporte

Para crear nuevos grupos durante el piloto, los docentes deben enviar email a:
**soporte@celestea.ai**

Template del email (auto-populated):
```
Asunto: Solicitud de Nuevo Grupo
Cuerpo: Hola, me gustaría crear un nuevo grupo para mi clase.
```

El equipo de Celestea creará el grupo manualmente en Supabase y notificará al docente con el código de acceso.

---

**Implementado por:** Architect  
**Fecha:** 2025-10-03  
**Status:** ✅ Ready for Pilot
