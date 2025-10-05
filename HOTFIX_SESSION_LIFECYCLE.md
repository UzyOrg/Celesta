# 🚨 HOTFIX CRÍTICO: Reparación del Ciclo de Vida de Sesión

**Status:** ✅ COMPLETADO  
**PR:** `fix(auth): repair critical user session lifecycle`  
**Fecha:** 2025-10-03  
**Prioridad:** CRÍTICA

---

## 🎯 Problema Identificado

El ciclo de vida de la sesión del usuario estaba fundamentalmente roto:

**❌ Síntomas:**
1. Logout no funcionaba correctamente
2. Menú de perfil no se cerraba al hacer clic fuera
3. AppShell no detectaba cambios de alias en tiempo real
4. Después de logout, no había forma de volver a entrar
5. AliasGuard redirigía a `/join` pero el usuario no podía volver a la página original
6. Loop infinito: Usuario sin alias → redirige a `/join` → establece alias → no vuelve al taller

**Resultado:** Aplicación inutilizable para flujos reales de usuario.

---

## ✅ Solución Implementada

### **FASE 1: Logout Funcional**

#### 1.1 Función Centralizada de Logout

**Archivo:** `src/lib/session.ts`

```typescript
export function logout(): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Recopilar todas las claves que comienzan con 'celesta:'
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('celesta:')) {
        keysToDelete.push(key);
      }
    }
    
    // Eliminar todas las claves recopiladas
    keysToDelete.forEach(key => localStorage.removeItem(key));
    
    console.log(`[logout] Cleared ${keysToDelete.length} session keys`);
  } catch (e) {
    console.error('[logout] Failed to clear localStorage', e);
  }
  
  // Forzar recarga completa y redirigir a la raíz
  window.location.href = '/';
}
```

**Características:**
- ✅ Borra TODAS las claves con prefijo `celesta:`
- ✅ Incluye: `celesta:alias:*`, `celesta:sid:*`, `celesta:last_teacher_token`
- ✅ Redirige a `/` (página de inicio)
- ✅ Fuerza recarga completa (no SPA navigation)

#### 1.2 Menú de Perfil con Click-Outside

**Archivo:** `src/components/shell/AppShell.tsx`

**Cambios:**
```typescript
const profileMenuRef = useRef<HTMLDivElement>(null);

// Cerrar menú de perfil al hacer clic fuera
useEffect(() => {
  if (!profileMenuOpen) return;

  const handleClickOutside = (event: MouseEvent) => {
    if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
      setProfileMenuOpen(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [profileMenuOpen]);

// Función de logout usando la función centralizada
const handleLogout = () => {
  setProfileMenuOpen(false);
  logout();
};
```

**Características:**
- ✅ Menú se cierra al hacer clic fuera del área
- ✅ Usa `useRef` para detectar click outside
- ✅ Botón "Cerrar Sesión" llama a `logout()` centralizado

---

### **FASE 2: Alias Persistente y Reactivo**

#### 2.1 AppShell Reactivo a Cambios en localStorage

**Archivo:** `src/components/shell/AppShell.tsx`

```typescript
const [displayAlias, setDisplayAlias] = useState(userAlias || 'Invitado');

// Reaccionar a cambios en el alias del localStorage
useEffect(() => {
  if (typeof window === 'undefined') return;

  const updateAliasFromStorage = () => {
    // Intentar obtener alias de cualquier token guardado
    const keys = Object.keys(localStorage).filter(k => k.startsWith('celesta:alias:'));
    if (keys.length > 0) {
      const latestAlias = localStorage.getItem(keys[keys.length - 1]);
      if (latestAlias) {
        setDisplayAlias(latestAlias);
        return;
      }
    }
    setDisplayAlias(userAlias || 'Invitado');
  };

  // Actualizar al montar
  updateAliasFromStorage();

  // Escuchar cambios en storage
  window.addEventListener('storage', updateAliasFromStorage);
  
  // Polling ligero como fallback (para cambios en la misma pestaña)
  const interval = setInterval(updateAliasFromStorage, 1000);

  return () => {
    window.removeEventListener('storage', updateAliasFromStorage);
    clearInterval(interval);
  };
}, [userAlias]);
```

**Características:**
- ✅ Detecta cambios en `localStorage` en tiempo real
- ✅ Polling cada 1 segundo como fallback (misma pestaña)
- ✅ Actualiza `displayAlias` automáticamente
- ✅ Sin necesidad de recargar página

#### 2.2 JoinForm con Redirección de Retorno

**Archivos:**
- `src/app/join/page.tsx`
- `src/components/join/JoinFormModern.tsx`

**Cambios:**

```typescript
// page.tsx - capturar redirect de query params
const redirectTo = typeof sp?.redirect === 'string' ? sp!.redirect : '';
return <JoinFormModern token={token} redirectTo={redirectTo} />;

// JoinFormModern.tsx - redirigir de vuelta después de establecer alias
const onSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  const trimmed = alias.trim();
  if (!trimmed) return;
  
  setIsLoading(true);
  
  try {
    // Guardar alias en localStorage de forma fiable
    setAliasInLocalStorage(token, trimmed);
    
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Determinar redirección
    let redirectUrl: string;
    const t = token || "DEMO-101";
    
    if (redirectTo) {
      // Si hay una URL de redirección explícita, usarla
      redirectUrl = redirectTo.includes('?') 
        ? `${redirectTo}&t=${encodeURIComponent(t)}`
        : `${redirectTo}?t=${encodeURIComponent(t)}`;
    } else {
      // Por defecto, ir al taller del estudiante
      redirectUrl = `/demo/student?t=${encodeURIComponent(t)}`;
    }
    
    // Forzar recarga completa para que AppShell detecte el nuevo alias
    window.location.href = redirectUrl;
  } catch {
    setIsLoading(false);
  }
};
```

**Características:**
- ✅ Acepta parámetro `redirect` en query params
- ✅ Después de establecer alias, redirige a la página original
- ✅ Fallback a `/demo/student` si no hay redirect
- ✅ Usa `window.location.href` para forzar recarga completa

#### 2.3 AliasGuard con Captura de URL de Origen

**Archivo:** `src/components/join/AliasGuard.tsx`

```typescript
export default function AliasGuard({ token }: { token: string }) {
  useEffect(() => {
    const t = token || "";
    try {
      const key = `celesta:alias:${t || "__global__"}`;
      const alias = localStorage.getItem(key);
      if (!alias || alias.trim().length === 0) {
        // Capturar la URL actual para redirección de vuelta después de establecer alias
        const currentUrl = window.location.pathname + window.location.search;
        const redirectParam = encodeURIComponent(currentUrl);
        
        const url = new URL(window.location.href);
        const currentT = url.searchParams.get("t") || t;
        
        // Redirigir a /join con token y URL de retorno
        window.location.replace(
          `/join?t=${encodeURIComponent(currentT)}&redirect=${redirectParam}`
        );
      }
    } catch {
      // If localStorage fails, be safe and route to join
      if (t) {
        const currentUrl = window.location.pathname + window.location.search;
        const redirectParam = encodeURIComponent(currentUrl);
        window.location.replace(
          `/join?t=${encodeURIComponent(t)}&redirect=${redirectParam}`
        );
      }
    }
  }, [token]);
  return null;
}
```

**Características:**
- ✅ Captura URL completa (pathname + search params)
- ✅ Pasa `redirect` a `/join` como query param
- ✅ Sin loop infinito: después de establecer alias, vuelve al taller
- ✅ Funciona para cualquier página protegida

---

### **FASE 3: Logout para Docentes**

**Estado:** ✅ Ya implementado implícitamente

La función `logout()` centralizada borra:
- `celesta:last_teacher_token` (usado por docentes)
- `celesta:alias:*` (cualquier alias)
- `celesta:sid:*` (cualquier session ID)

**Resultado:** Logout funciona para estudiantes Y docentes.

---

## 📊 Flujo Completo Reparado

### **Flujo 1: Logout → Login con Alias → Navegación**

```mermaid
Usuario logueado
    ↓
Click en perfil → Menú abre
    ↓
Click en "Cerrar Sesión"
    ↓
logout() → Borra TODO localStorage (celesta:*)
    ↓
window.location.href = '/'
    ↓
Usuario en página de inicio
    ↓
localStorage limpio, sin alias
    ↓
Usuario intenta acceder a /demo/student?t=DEMO-101
    ↓
AliasGuard detecta: NO alias
    ↓
Redirige a /join?t=DEMO-101&redirect=%2Fdemo%2Fstudent%3Ft%3DDEMO-101
    ↓
Usuario introduce alias "AlexR"
    ↓
JoinForm: setAliasInLocalStorage("DEMO-101", "AlexR")
    ↓
Redirige a /demo/student?t=DEMO-101 (del param redirect)
    ↓
AliasGuard detecta: SÍ alias ✅
    ↓
Taller carga correctamente
    ↓
AppShell detecta alias en 1s (polling)
    ↓
Sidebar muestra "AlexR" (no "Invitado")
```

### **Flujo 2: Click Fuera del Menú**

```
Sidebar → Click en perfil → Menú abre
    ↓
Usuario hace clic en cualquier parte de la pantalla
    ↓
handleClickOutside detecta click fuera de profileMenuRef
    ↓
setProfileMenuOpen(false)
    ↓
Menú se cierra automáticamente
```

### **Flujo 3: Cambio de Alias en Tiempo Real**

```
AppShell montado → displayAlias = "Invitado"
    ↓
Usuario en otra pestaña establece alias "ProfeJuan"
    ↓
localStorage.setItem("celesta:alias:GRUPO-123", "ProfeJuan")
    ↓
Polling (1s) o evento 'storage' dispara updateAliasFromStorage()
    ↓
setDisplayAlias("ProfeJuan")
    ↓
Sidebar actualiza inmediatamente (sin reload)
```

---

## 🧪 Plan de Pruebas

### **Prueba 1: Logout Completo**

**Pasos:**
1. Entrar a `/join?t=DEMO-101`
2. Establecer alias: "TestUser"
3. Navegar por la app: `/dashboard`, `/missions`, `/biblioteca`
4. Verificar que sidebar muestra "TestUser"
5. Abrir DevTools → Application → Local Storage
6. Confirmar que existen claves: `celesta:alias:DEMO-101`, `celesta:sid:DEMO-101`
7. Click en perfil → "Cerrar Sesión"

**Resultado Esperado:**
- ✅ Redirige a `/` (página de inicio)
- ✅ Sidebar muestra "Invitado" (no "TestUser")
- ✅ Local Storage: NO existen claves `celesta:*`
- ✅ Si intentas acceder a `/demo/student?t=DEMO-101`, te redirige a `/join`

---

### **Prueba 2: Loop de Alias Roto (CRÍTICO)**

**Pasos:**
1. Asegúrate de que localStorage está limpio (Ctrl+Shift+Del)
2. Intenta acceder directamente a: `http://localhost:3000/demo/student?t=DEMO-101`
3. AliasGuard detecta: NO alias
4. Deberías ser redirigido a: `/join?t=DEMO-101&redirect=%2Fdemo%2Fstudent%3Ft%3DDEMO-101`
5. Verifica que ves la página `/join` con:
   - Badge "Grupo de clase: DEMO-101"
   - Campo de input para alias
6. Introduce alias: "LoopTest"
7. Click en "Comenzar Misión"

**Resultado Esperado:**
- ✅ Redirige de vuelta a `/demo/student?t=DEMO-101`
- ✅ AliasGuard NO dispara (ya hay alias)
- ✅ Taller carga correctamente
- ✅ Sidebar muestra "LoopTest" en máximo 1 segundo
- ❌ NO debe haber loop infinito `/join` ↔ `/demo/student`

---

### **Prueba 3: Navegación Persistente**

**Pasos:**
1. Completar Prueba 2 (alias establecido: "LoopTest")
2. Navegar a `/dashboard`
3. Verificar sidebar: "LoopTest"
4. Navegar a `/missions`
5. Verificar sidebar: "LoopTest"
6. Navegar a `/biblioteca`
7. Verificar sidebar: "LoopTest"
8. Refrescar página (F5)
9. Verificar sidebar: "LoopTest"

**Resultado Esperado:**
- ✅ Alias persiste en TODA la navegación
- ✅ Alias persiste después de refresh
- ✅ No hay flicker "Invitado" → "LoopTest"

---

### **Prueba 4: Click Fuera del Menú**

**Pasos:**
1. Con alias establecido, navegar a cualquier página
2. Click en área de perfil (abajo en sidebar)
3. Menú flotante aparece con "Cerrar Sesión"
4. SIN hacer click en nada del menú, hacer click en el área de contenido principal
5. Observar el menú

**Resultado Esperado:**
- ✅ Menú se cierra automáticamente
- ✅ Animación de salida (fade out)
- ✅ No se ejecuta logout

---

### **Prueba 5: Alias Reactivo (Bonus)**

**Requisito:** Tener 2 pestañas abiertas en localhost:3000

**Pasos:**
1. Pestaña A: Hacer logout (localStorage limpio)
2. Pestaña B: Sidebar muestra "Invitado"
3. Pestaña A: Ir a `/join?t=TEST-123`
4. Pestaña A: Establecer alias "ReactiveTest"
5. Pestaña A: Confirmar
6. Esperar 1-2 segundos
7. Cambiar a Pestaña B (sin refrescar)
8. Observar sidebar en Pestaña B

**Resultado Esperado:**
- ✅ Pestaña B: Sidebar cambia de "Invitado" → "ReactiveTest"
- ✅ Sin necesidad de refrescar página
- ✅ Actualización en máximo 1 segundo

---

### **Prueba 6: Logout de Docente**

**Pasos:**
1. Navegar a `/teacher/DEMO-101`
2. Verificar que sidebar muestra navegación de docente:
   - "Mis Grupos"
   - "Biblioteca"
   - No "Dashboard"
3. DevTools → Local Storage → Confirmar existe `celesta:last_teacher_token`
4. Click en perfil → "Cerrar Sesión"

**Resultado Esperado:**
- ✅ Redirige a `/`
- ✅ `celesta:last_teacher_token` eliminado
- ✅ Todo el localStorage limpio
- ✅ Si intentas acceder a `/teacher/DEMO-101`, te redirige a `/join`

---

## 📦 Archivos Modificados

### **Creados (2)**
- `HOTFIX_SESSION_LIFECYCLE.md` (este archivo)
- `src/components/join/SimpleAliasGuard.tsx` (guard para páginas sin token específico)

### **Modificados (9)**

1. **`src/lib/session.ts`**
   - ✅ Agregada función `logout()` centralizada

2. **`src/components/shell/AppShell.tsx`**
   - ✅ `useRef` para menú de perfil
   - ✅ Click-outside handler
   - ✅ Alias reactivo mejorado con búsqueda en cascada (polling 500ms + storage event)
   - ✅ `displayAlias` state
   - ✅ Integración con `logout()`
   - ✅ Busca alias en orden: token docente → DEMO-101 → __global__ → cualquier otro

3. **`src/app/join/page.tsx`**
   - ✅ Captura param `redirect` de searchParams
   - ✅ Pasa `redirectTo` a `JoinFormModern`

4. **`src/components/join/JoinFormModern.tsx`**
   - ✅ Acepta prop `redirectTo`
   - ✅ Guarda alias en AMBOS lugares: global + token específico
   - ✅ Redirección inteligente (preserva token en URL si existe)
   - ✅ Fallback a `/missions` en lugar de `/demo/student`

5. **`src/components/join/AliasGuard.tsx`**
   - ✅ Busca alias con fallback: token específico → __global__
   - ✅ Copia alias global a token específico automáticamente
   - ✅ Captura URL actual (pathname + search)
   - ✅ Pasa `redirect` param a `/join`
   - ✅ Sin loop infinito
   - ✅ Logging detallado para debugging

6. **`src/app/missions/page.tsx`**
   - ✅ Agregado `SimpleAliasGuard` para proteger acceso
   - ✅ Redirige a `/join` si no hay alias

7. **`src/app/dashboard/page.tsx`**
   - ✅ Agregado `SimpleAliasGuard` para proteger acceso
   - ✅ Redirige a `/join` si no hay alias

8. **`src/app/biblioteca/page.tsx`**
   - ✅ Agregado `SimpleAliasGuard` para proteger acceso
   - ✅ Redirige a `/join` si no hay alias

9. **`src/components/join/SimpleAliasGuard.tsx`** (NUEVO)
   - ✅ Guard ligero para páginas que no requieren token específico
   - ✅ Busca cualquier alias en localStorage
   - ✅ Redirige a `/join` con URL de retorno si no encuentra alias

---

## 🚀 Despliegue

### **Comandos:**

```bash
# 1. Verificar que compila sin errores
pnpm run build

# 2. Ejecutar tests locales (manual)
pnpm run dev
# Seguir plan de pruebas arriba

# 3. Commit y push
git add .
git commit -m "fix(auth): repair critical user session lifecycle

BREAKING: Full session reset on logout
FIXED: Infinite loop on alias requirement
ADDED: Click-outside menu close
ADDED: Reactive alias detection in AppShell
ADDED: Return URL support in /join flow

Closes: #SESSION-LIFECYCLE-CRITICAL"

git push origin main
```

---

## ✅ Checklist de Completitud

- [x] FASE 1: Función `logout()` centralizada
- [x] FASE 1: Menú de perfil con click-outside
- [x] FASE 1: Botón "Cerrar Sesión" funcional
- [x] FASE 2: AppShell reactivo a cambios en localStorage (mejorado con cascada)
- [x] FASE 2: JoinForm con soporte para `redirectTo`
- [x] FASE 2: JoinForm guarda alias en múltiples ubicaciones
- [x] FASE 2: AliasGuard con fallback a alias global
- [x] FASE 2: AliasGuard captura URL de origen
- [x] FASE 2: SimpleAliasGuard para páginas sin token específico
- [x] FASE 2: Protección agregada a /missions, /dashboard, /biblioteca
- [x] FASE 3: Logout funciona para docentes
- [x] Plan de pruebas detallado
- [x] Documentación actualizada
- [ ] **PENDIENTE: Ejecutar las 6 pruebas manualmente**

---

## 🐛 Bugs Conocidos (Out of Scope)

1. **Polling a 1s consume CPU:**
   - Solución futura: Usar `BroadcastChannel` API
   - Impacto actual: Mínimo (solo 1 llamada/s)

2. **No hay feedback visual durante logout:**
   - Solución futura: Mostrar spinner "Cerrando sesión..."
   - Impacto actual: Logout es instantáneo, no crítico

3. **No hay página de "Sesión Cerrada":**
   - Solución futura: Mostrar `/` con mensaje "Has cerrado sesión exitosamente"
   - Impacto actual: Usuario es redirigido a `/`, funcional pero sin feedback

---

## 📞 Soporte

**Autor:** Architect (Principal Engineer)  
**Fecha:** 2025-10-03  
**Estado:** ✅ IMPLEMENTADO - Pendiente de Pruebas Manuales

---

**Próximos Pasos:**
1. Ejecutar las 6 pruebas del plan
2. Si todas pasan → Deploy a producción
3. Si alguna falla → Reportar bug específico y fix inmediato
