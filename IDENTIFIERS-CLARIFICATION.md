# Aclaración de Identificadores en Celesta

**Fecha:** 2025-01-05  
**Razón:** Confusión entre `class_token`, `workshop_id` y nombres legacy

---

## 📚 Dos Tipos de Identificadores

### **1. Class Token (Código de Grupo)**

Identifica un **grupo/clase** de estudiantes.

**Ejemplos:**
- `DEMO-101` - Grupo de demostración
- `CIENCIAS-101` - Grupo de Ciencias
- `MAT-3A` - Grupo de Matemáticas 3A
- `BIO-5B` - Grupo de Biología 5B

**Dónde se usa:**
- URL de invitación: `/join?t=CIENCIAS-101`
- Tabla: `class_assignments.class_token`
- Tabla: `student_roster.class_token`
- Local Storage: `celesta:alias:CIENCIAS-101`

---

### **2. Workshop ID (Código de Taller)**

Identifica un **contenido/taller** educativo.

**Ejemplos:**
- `BIO-001` - "Célula: El Origen de una Enfermedad Misteriosa"
- `BIO-001-PRE` - Pre-taller de nivelación
- `ALG-001` - Taller de algoritmos
- `DEV-TEST` - Taller de pruebas

**Dónde se usa:**
- Archivo JSON: `/public/workshops/BIO-001.json`
- Campo JSON: `"id_taller": "BIO-001"`
- Tabla: `class_assignments.assigned_workshop_id`
- Parámetro: `<WorkshopClientWithShell id="BIO-001" />`

---

## 🔗 Relación entre Identificadores

```
┌─────────────────┐        ┌──────────────────┐
│  Class Token    │  →     │   Workshop ID    │
│  (Grupo)        │        │   (Contenido)    │
├─────────────────┤        ├──────────────────┤
│  DEMO-101       │  →     │   BIO-001        │
│  CIENCIAS-101   │  →     │   BIO-001        │
│  MAT-3A         │  →     │   ALG-001        │
└─────────────────┘        └──────────────────┘
      Múltiples grupos → Pueden usar el mismo taller
```

**Tabla SQL:**
```sql
SELECT class_token, assigned_workshop_id 
FROM class_assignments;

-- Resultado:
-- class_token    | assigned_workshop_id
-- ---------------|---------------------
-- DEMO-101       | BIO-001
-- CIENCIAS-101   | BIO-001
-- MAT-3A         | ALG-001
```

---

## ❌ Identificadores Legacy (Deprecated)

### **`cell-mystery`**
- Era el ID antiguo del taller de células
- **Reemplazado por:** `BIO-001`
- **Estado:** ELIMINADO en este fix

**Archivos modificados:**
- ✅ `src/app/demo/student/page.tsx` - Fallback cambiado a `BIO-001`
- ✅ `lib/supabase/migrations/prd-class-assignments.sql` - Demo data usa `BIO-001`
- ✅ `lib/supabase/migrations/FIX-002-update-workshop-ids.sql` - UPDATE en BD

---

## 📂 Estructura de Archivos

```
public/workshops/
├── BIO-001.json         ← Taller principal de células
├── BIO-001-PRE.json     ← Pre-taller de nivelación
├── ALG-001.json         ← Taller de algoritmos
├── DEV-TEST.json        ← Taller de pruebas
└── index.json           ← Índice de talleres disponibles
```

**Contenido de `BIO-001.json`:**
```json
{
  "id_taller": "BIO-001",
  "titulo": "Célula: El Origen de una Enfermedad Misteriosa",
  "version": "1.0.0",
  "pasos": [...]
}
```

---

## 🎯 Flujo Completo con Identificadores

### **1. Docente crea grupo:**
```typescript
POST /api/groups/create
{
  "class_token": "CIENCIAS-101",
  "assigned_workshop_id": "BIO-001"
}
```

### **2. Estudiante se une:**
```
URL: /join?t=CIENCIAS-101
```

### **3. Sistema obtiene workshop asignado:**
```typescript
GET /api/assignments/get-workshop?class_token=CIENCIAS-101
// Response: { "workshop_id": "BIO-001" }
```

### **4. Estudiante accede al taller:**
```
URL: /demo/student?t=CIENCIAS-101
→ Carga /public/workshops/BIO-001.json
```

---

## 🔧 Cambios en Este Fix

### **Código:**
1. ✅ Cambiado fallback de `'cell-mystery'` a `'BIO-001'` en `/demo/student/page.tsx`
2. ✅ Actualizado demo data en migración SQL

### **Base de Datos (Ejecutar en Supabase):**
```sql
-- Ejecutar: lib/supabase/migrations/FIX-002-update-workshop-ids.sql
```

Este script:
- Actualiza `DEMO-101` de `cell-mystery` → `BIO-001`
- Crea `CIENCIAS-101` con `BIO-001`
- Asigna `teacher_id` si existe el teacher

---

## ✅ Verificación

### **Verificar en Supabase:**
```sql
SELECT class_token, assigned_workshop_id, teacher_id 
FROM class_assignments 
ORDER BY class_token;
```

**Resultado esperado:**
```
class_token    | assigned_workshop_id | teacher_id
---------------|----------------------|------------
CIENCIAS-101   | BIO-001              | uuid-xyz
DEMO-101       | BIO-001              | uuid-xyz
```

### **Verificar en Local:**
1. Ir a `/join?t=CIENCIAS-101`
2. Ingresar alias y solicitar acceso
3. Docente aprueba en `/grupos/CIENCIAS-101`
4. Estudiante ve `/missions`
5. Click en misión → Va a `/demo/student?t=CIENCIAS-101`
6. **Debería cargar BIO-001 sin error 404** ✅

---

## 📝 Convenciones de Nombres

### **Class Tokens:**
- Formato: `MATERIA-NUMERO` o `MATERIA-SECCION`
- Ejemplos: `CIENCIAS-101`, `MAT-3A`, `BIO-5B`
- **Único por grupo**
- Visible en URLs

### **Workshop IDs:**
- Formato: `AREA-NUMERO[-SUFIJO]`
- Ejemplos: `BIO-001`, `BIO-001-PRE`, `ALG-001`
- **Reutilizable** (múltiples grupos pueden usarlo)
- Coincide con nombre de archivo JSON

---

## 🚀 Deploy Checklist

- [x] Actualizar código (fallback a BIO-001)
- [ ] Ejecutar FIX-002 en Supabase SQL Editor
- [ ] Commit y push a GitHub
- [ ] Verificar deployment en Vercel
- [ ] Probar flujo estudiante en producción

```bash
git add .
git commit -m "Fix: Actualizar workshop IDs de cell-mystery a BIO-001"
git push origin main
```
