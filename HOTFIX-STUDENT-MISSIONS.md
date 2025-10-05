# HOTFIX: Student Missions Flow

**Fecha:** 2025-01-05
**Tipo:** Bug Fix - Student Navigation & Workshop Assignment

---

## 🐛 Problemas Reportados

### 1. **Redirección constante al formulario de alias**
**Síntoma:** El estudiante entra con su alias, ve sus misiones, pero al hacer click en una misión se le redirige al formulario de alias nuevamente.

**Causa:** La página `/missions` tenía el link hardcodeado a `/demo/student?t=DEMO-101`, ignorando el `classToken` del estudiante actual.

### 2. **Workshop no asignado correctamente**
**Síntoma:** El estudiante no ve el workshop asignado a su grupo (CIENCIAS-101), sino siempre el demo.

**Causa:** No se estaba obteniendo el workshop asignado dinámicamente desde `class_assignments`.

---

## ✅ Solución Implementada

### Archivo Modificado: `src/app/(dashboard)/missions/page.tsx`

**Cambios:**

1. **Importar AuthContext:**
   ```tsx
   import { useAuth } from '@/contexts/AuthContext';
   ```

2. **Obtener classToken del estudiante:**
   ```tsx
   const { userState } = useAuth();
   ```

3. **Fetch dinámico del workshop asignado:**
   ```tsx
   useEffect(() => {
     async function fetchAssignedWorkshop() {
       if (!userState.classToken) return;
       
       const response = await fetch(
         `/api/assignments/get-workshop?class_token=${userState.classToken}`
       );
       const data = await response.json();
       setAssignedWorkshop(data.workshop_id);
     }
     
     fetchAssignedWorkshop();
   }, [userState.classToken]);
   ```

4. **Link dinámico a misiones:**
   ```tsx
   const workshopUrl = userState.classToken 
     ? `/demo/student?t=${userState.classToken}`
     : '/demo/student?t=DEMO-101';
   
   <Link href={workshopUrl}>...</Link>
   ```

5. **Estado de carga:**
   - Agregado `loading` state
   - Muestra spinner mientras obtiene el workshop

---

## 🎯 Resultado Esperado

### **Flujo Correcto del Estudiante:**

1. **Estudiante entra con link:** `/join?t=CIENCIAS-101`
2. **Ingresa alias:** "Juan Pérez"
3. **Docente aprueba** en `/grupos/CIENCIAS-101`
4. **Estudiante ve misiones** en `/missions`
5. **Click en misión →** Va a `/demo/student?t=CIENCIAS-101` ✅
6. **NO se redirige al formulario de alias** ✅
7. **Ve el workshop asignado a CIENCIAS-101** (cell-mystery) ✅

---

## 🧪 Testing Checklist

- [ ] Estudiante aprobado puede navegar entre `/missions` y workshop sin perder sesión
- [ ] El link de la misión usa el `classToken` correcto del estudiante
- [ ] El workshop asignado se carga desde `class_assignments`
- [ ] Si no hay workshop asignado, muestra fallback a DEMO-101
- [ ] Estado de loading se muestra correctamente

---

## 📊 Impacto

**Antes:**
- ❌ Estudiantes perdían sesión al navegar
- ❌ Siempre veían DEMO-101
- ❌ Mala experiencia de usuario

**Después:**
- ✅ Navegación fluida sin perder sesión
- ✅ Workshop correcto según su grupo
- ✅ Experiencia consistente

---

## 🔗 Archivos Relacionados

- `src/app/(dashboard)/missions/page.tsx` - Fix principal
- `src/app/api/assignments/get-workshop/route.ts` - API existente (sin cambios)
- `src/components/guards/EstudianteGuard.tsx` - Guard de autorización (sin cambios)
- `src/contexts/AuthContext.tsx` - Contexto de autenticación (sin cambios)

---

## 🚀 Deploy

```bash
git add .
git commit -m "Fix: Student missions navigation usando classToken dinámico"
git push origin main
```

Vercel desplegará automáticamente.

---

## 📝 Notas

- El `EstudianteGuard` sigue funcionando correctamente y valida el roster
- El cambio es **backward compatible** con el flujo de DEMO-101
- Si `classToken` no está disponible, usa DEMO-101 como fallback
