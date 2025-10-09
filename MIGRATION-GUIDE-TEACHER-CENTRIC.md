# 🔄 Guía de Migración: Modelo Centrado en Docente

## 📋 Resumen de Cambios

Esta migración transforma Celesta de un modelo **grupo-céntrico** (1 grupo = 1 taller rígido) a un modelo **docente-céntrico** (biblioteca personal + asignación flexible).

### Arquitectura ANTES:
```
teachers → class_assignments (assigned_workshop_id)
```

### Arquitectura DESPUÉS:
```
teachers → docente_biblioteca ← talleres
                ↓
         class_assignments ← grupo_talleres → talleres
```

---

## 🗂️ Archivos Creados

### 1. Migraciones SQL
- ✅ `supabase/migrations/20250108_refactor_teacher_centric_up.sql` - Migración principal
- ✅ `supabase/migrations/20250108_refactor_teacher_centric_down.sql` - Rollback

### 2. Tipos TypeScript
- ✅ `src/types/biblioteca.ts` - Tipos para talleres y biblioteca

### 3. Lógica de Backend
- ✅ `src/lib/supabase/biblioteca.ts` - Funciones de acceso a datos
- ✅ `src/app/(dashboard)/biblioteca/actions.ts` - Server Actions para biblioteca
- ✅ `src/app/(dashboard)/grupos/[groupId]/actions.ts` - Server Actions para asignación

### 4. API Routes
- ✅ `src/app/api/library/route.ts` - Endpoint para obtener biblioteca

### 5. Componentes UI
- ✅ `src/components/grupos/AssignWorkshopsModal.tsx` - Modal de asignación

---

## 🚀 Pasos de Ejecución

### PASO 1: Backup de Base de Datos ⚠️

**CRÍTICO:** Antes de ejecutar cualquier migración, haz un backup completo.

```bash
# En Supabase Dashboard:
# Settings → Database → Backups → Create Backup
```

---

### PASO 2: Ejecutar Migración SQL

#### Opción A: Supabase CLI (Recomendado)

```bash
# 1. Asegúrate de tener Supabase CLI instalado
npx supabase --version

# 2. Link a tu proyecto
npx supabase link --project-ref <tu-project-ref>

# 3. Ejecutar migración
npx supabase db push
```

#### Opción B: SQL Editor Manual

1. Abre **Supabase Dashboard** → **SQL Editor**
2. Copia el contenido de `supabase/migrations/20250108_refactor_teacher_centric_up.sql`
3. Pega y ejecuta
4. Verifica los mensajes de NOTICE al final

---

### PASO 3: Verificar Migración de Datos

Ejecuta estas queries en Supabase SQL Editor:

```sql
-- 1. Verificar talleres creados
SELECT COUNT(*) as total_talleres FROM public.talleres;

-- 2. Verificar biblioteca de docentes
SELECT COUNT(*) as total_biblioteca FROM public.docente_biblioteca;

-- 3. Verificar asignaciones grupo-taller
SELECT COUNT(*) as total_asignaciones FROM public.grupo_talleres;

-- 4. Comparar con datos originales
SELECT COUNT(*) as grupos_con_taller 
FROM public.class_assignments 
WHERE assigned_workshop_id IS NOT NULL;

-- 5. Ver detalle de un docente
SELECT 
  t.nombre,
  db.agregado_en,
  COUNT(gt.id) as grupos_usando
FROM public.docente_biblioteca db
JOIN public.talleres t ON t.id = db.taller_id
LEFT JOIN public.grupo_talleres gt ON gt.taller_id = t.id
WHERE db.teacher_id = '<TEACHER_ID_AQUI>'
GROUP BY t.id, t.nombre, db.agregado_en;
```

**Resultado Esperado:**
- `total_talleres` ≈ número de `assigned_workshop_id` únicos
- `total_biblioteca` ≥ `total_talleres`
- `total_asignaciones` = `grupos_con_taller`

---

### PASO 4: Eliminar Columna Obsoleta (OPCIONAL)

⚠️ **Solo después de verificar que todo funciona correctamente**

```sql
-- Descomentar esta línea en el archivo de migración:
ALTER TABLE public.class_assignments DROP COLUMN IF EXISTS assigned_workshop_id;
```

O ejecutar manualmente en SQL Editor.

---

### PASO 5: Actualizar Código de la Aplicación

#### 5.1 Instalar Dependencias (si es necesario)

```bash
npm install
```

#### 5.2 Actualizar Variables de Entorno

No se requieren nuevas variables de entorno.

#### 5.3 Reiniciar Servidor de Desarrollo

```bash
npm run dev
```

---

## 🧪 Testing

### Test 1: Verificar Biblioteca

1. Login como docente en `/pilot-login`
2. Navegar a `/dashboard/biblioteca`
3. ✅ Verificar que se muestran los talleres migrados
4. ✅ Verificar búsqueda funciona
5. ✅ Verificar que muestra "X grupos" por taller

### Test 2: Asignar Talleres a Grupo

1. Navegar a `/dashboard/grupos`
2. Click en un grupo existente
3. Click en "Añadir Taller" (botón nuevo)
4. ✅ Modal se abre con talleres de biblioteca
5. ✅ Búsqueda funciona con debounce
6. ✅ Seleccionar múltiples talleres
7. ✅ Click "Añadir X talleres"
8. ✅ Modal se cierra y talleres aparecen asignados

### Test 3: Desasignar Taller

1. En vista de grupo, click en "Remover" en un taller asignado
2. ✅ Taller se elimina de la lista
3. ✅ Taller sigue en biblioteca (no se elimina)

### Test 4: RLS (Seguridad)

```sql
-- Como docente A, intentar ver talleres de docente B
-- Debe devolver 0 resultados
SELECT * FROM public.talleres WHERE owner_teacher_id = '<DOCENTE_B_ID>';

-- Como docente A, intentar asignar taller a grupo de docente B
-- Debe fallar con error de RLS
INSERT INTO public.grupo_talleres (group_id, taller_id, assigned_by_teacher_id)
VALUES ('<GRUPO_DE_B>', '<TALLER_DE_A>', '<DOCENTE_A_ID>');
```

---

## 🔄 Rollback (Si es necesario)

Si algo sale mal, puedes revertir los cambios:

```bash
# Opción A: Supabase CLI
npx supabase db reset

# Opción B: SQL Editor Manual
# Ejecutar: supabase/migrations/20250108_refactor_teacher_centric_down.sql
```

**⚠️ ADVERTENCIA:** El rollback restaurará `assigned_workshop_id` con el **primer** taller asignado por grupo. Si un grupo tenía múltiples talleres, se perderán los demás.

---

## 📊 Métricas de Éxito

- [ ] Migración SQL ejecutada sin errores
- [ ] Conteos de verificación coinciden
- [ ] Biblioteca muestra talleres correctamente
- [ ] Modal de asignación funciona
- [ ] RLS policies funcionan (docentes solo ven sus datos)
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs de Supabase

---

## 🐛 Troubleshooting

### Error: "relation talleres does not exist"

**Causa:** La migración no se ejecutó correctamente.

**Solución:**
1. Verifica que el archivo SQL se ejecutó completo
2. Revisa logs de Supabase para errores
3. Ejecuta manualmente las secciones que fallaron

### Error: "RLS policy violation"

**Causa:** Las políticas RLS no permiten la operación.

**Solución:**
1. Verifica que el usuario está autenticado
2. Verifica que `auth.uid()` mapea correctamente a `teachers.id`
3. Revisa las políticas en Supabase Dashboard → Authentication → Policies

### Error: "assigned_workshop_id column not found"

**Causa:** La columna ya fue eliminada pero el código aún la referencia.

**Solución:**
1. Busca `assigned_workshop_id` en el código:
   ```bash
   grep -r "assigned_workshop_id" src/
   ```
2. Actualiza esos archivos para usar `grupo_talleres` en su lugar

### Talleres no aparecen en biblioteca

**Causa:** El trigger `fn_add_owner_taller_to_library` no se ejecutó.

**Solución:**
```sql
-- Ejecutar manualmente el backfill
INSERT INTO public.docente_biblioteca (teacher_id, taller_id)
SELECT DISTINCT owner_teacher_id, id
FROM public.talleres
ON CONFLICT DO NOTHING;
```

---

## 📝 Próximos Pasos

Después de completar la migración:

1. **Actualizar Componentes Existentes:**
   - Modificar `GroupCard` para mostrar múltiples talleres
   - Actualizar dashboard de docente
   - Actualizar vista de estudiante si es necesario

2. **Implementar Funcionalidades Adicionales:**
   - Crear/editar talleres desde UI
   - Compartir talleres entre docentes
   - Duplicar talleres
   - Reordenar talleres en grupo (drag & drop)

3. **Optimizaciones:**
   - Agregar índices adicionales si hay queries lentas
   - Implementar caché con React Query o SWR
   - Añadir paginación infinita en biblioteca

4. **Documentación:**
   - Actualizar README con nueva arquitectura
   - Documentar API endpoints
   - Crear guía de usuario para docentes

---

## 📞 Soporte

Si encuentras problemas durante la migración:

1. Revisa los logs de Supabase
2. Verifica la consola del navegador
3. Consulta este documento de troubleshooting
4. Haz rollback si es crítico

---

**Última actualización:** 2025-01-08  
**Versión:** 1.0  
**Autor:** Cascade AI
