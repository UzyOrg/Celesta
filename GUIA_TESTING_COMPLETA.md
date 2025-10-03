# 🧪 Guía Completa de Testing - Refactor Pedagógico UX

**Fecha:** 2025-10-02  
**Versión:** 1.0  
**Status:** Listo para QA

---

## 🎯 Objetivo

Verificar que todos los cambios pedagógicos y de UX funcionan correctamente en diferentes flujos y roles (estudiante/profesor).

---

## 🧹 Preparación: Limpiar Estado

**IMPORTANTE:** Para testing desde cero, necesitas limpiar localStorage.

### Opción 1: Limpiar Todo (Recomendado)
```
1. F12 (DevTools)
2. Application → Local Storage → localhost:3000
3. Click derecho en "localhost:3000" → Clear
4. Recargar página (Ctrl+R)
```

### Opción 2: Limpiar Solo Diagnóstico
```
1. F12 (DevTools)
2. Application → Local Storage → localhost:3000
3. Buscar claves:
   - adaptive_profile_BIO-001_DEMO-101_<sessionId>
   - Eliminar solo esas
4. Recargar página
```

### Verificar Limpieza
```
Console → localStorage.length
// Si es 0 o muy bajo, estás limpio
```

---

## 🎓 Testing Flujo Estudiante

### Test 1: Diagnóstico + 3 Estrellas ✅

**Objetivo:** Verificar que el diagnóstico personaliza pero NO afecta estrellas.

**Pasos:**
```
1. Limpiar localStorage
2. http://localhost:3000/demo/student?t=DEMO-101
3. VERIFICAR: Aparece cuestionario de diagnóstico
4. Completar diagnóstico:
   - Q1 (Conocimiento): "Es la primera vez..." (peso: 10)
   - Q2 (Estilo): "Observando imágenes..." (visual)
   - Q3 (Autonomía): "Prefiero que alguien me guíe..." (peso: 20)
   - Q4 (Contexto): Cualquier opción
5. Click "Comenzar Taller"
6. ✅ VERIFICAR CRÍTICO:
   - Tarjeta "Personalizado para ti" aparece
   - Mensaje menciona "observaciones visuales" (personalización funciona)
   - Autonomía: 3/3 ⭐⭐⭐ (NO 1/3)
```

**Resultado Esperado:**
- Diagnóstico ejecutado
- Perfil generado (conocimiento: ~15, autonomía: ~20)
- **Estrellas: 3** (independiente del perfil)
- Personalización visible en mensaje

---

### Test 2: Ciclo de Andamio Limpio ✅

**Objetivo:** Verificar que el andamio funciona sin bugs visuales.

**Pasos:**
```
1. Desde Test 1, avanzar al Paso 4
2. Escribir respuesta incorrecta: "no sé"
3. Click "Probar"
4. ✅ VERIFICAR: Card rojo aparece ("Casi, pero...")
5. Escribir otra respuesta incorrecta
6. Click "Reintentar"
7. ✅ VERIFICAR: Banner andamio aparece
8. Click "Ver Ejemplo (-1⭐)"
9. ✅ VERIFICAR CRÍTICO:
   - Card rojo DESAPARECE (bug corregido)
   - Santuario se abre automáticamente
   - Muestra "📝 Respuesta Modelo" con explicación
   - Panel principal muestra "Pregunta de Aplicación"
   - 4 opciones de respuesta visible
   - Autonomía: 2/3 ⭐⭐ (gastó 1 estrella)
```

**Resultado Esperado:**
- Transición limpia al andamio
- Sin feedback residual
- Santuario abierto
- Pregunta de aplicación renderizada

---

### Test 3: Un Solo Botón en Todo Momento ✅

**Objetivo:** Verificar que nunca aparecen 2 botones juntos.

**Pasos:**
```
1. Continuar desde Test 2
2. ✅ VERIFICAR: Solo 1 botón visible ("Enviar Respuesta")
3. Seleccionar respuesta INCORRECTA
4. Click "Enviar Respuesta"
5. ✅ VERIFICAR:
   - Feedback de error aparece
   - Solo 1 botón visible ("Enviar Respuesta")
6. Seleccionar respuesta CORRECTA
7. Click "Enviar Respuesta"
8. ✅ VERIFICAR CRÍTICO:
   - Feedback de éxito aparece
   - Solo 1 botón visible ("Continuar")
   - ❌ NO DEBE: Aparecer "Enviar Respuesta" + "Continuar" juntos
9. Click "Continuar"
10. ✅ VERIFICAR: Avanza al Paso 5
```

**Resultado Esperado:**
- Máximo 1 botón CTA en todo momento
- Transición clara de "Enviar" → "Continuar"

---

### Test 4: Biblioteca con Wrapper ✅

**Objetivo:** Verificar que Biblioteca tiene sidebar y navegación.

**Pasos:**
```
1. Desde cualquier página del dashboard
2. ✅ VERIFICAR: Sidebar visible a la izquierda
3. ✅ VERIFICAR: "Biblioteca" SIN gris/deshabilitado
4. Click en "Biblioteca"
5. ✅ VERIFICAR CRÍTICO:
   - Sidebar SIGUE visible (bug corregido)
   - Página "Próximamente" renderiza
   - Título: "Tu Segundo Cerebro está en Construcción"
   - Features para Estudiantes y Docentes visibles
   - Botón "Ver Mis Misiones" funcional
6. Click "Ver Mis Misiones"
7. ✅ VERIFICAR: Navega a /missions correctamente
```

**Resultado Esperado:**
- Biblioteca integrada en dashboard
- Sidebar siempre presente
- Navegación fluida

---

### Test 5: Completar Taller End-to-End ✅

**Objetivo:** Verificar flujo completo desde diagnóstico hasta MissionComplete.

**Pasos:**
```
1. Limpiar localStorage
2. http://localhost:3000/demo/student?t=DEMO-101
3. Completar diagnóstico (cualquier opción)
4. Completar BIO-001 (todos los pasos)
5. ✅ VERIFICAR en cada paso:
   - Autonomía se actualiza correctamente
   - Feedback aparece cuando fallas
   - Andamio funciona si fallas 2 veces
6. Completar último paso
7. ✅ VERIFICAR:
   - Pantalla "¡Misión Completada!" aparece
   - Muestra estrellas finales (ej: 2/3 si usaste andamio)
   - Botón "Explorar Más Misiones" funcional
8. Click "Explorar Más Misiones"
9. ✅ VERIFICAR: Navega a /missions
10. ✅ VERIFICAR: BIO-001 muestra badge "Completada"
```

**Resultado Esperado:**
- Flujo completo sin errores
- Estrellas finales reflejan autonomía demostrada
- Misión marcada como completada

---

## 👨‍🏫 Testing Flujo Profesor

### Test 6: Panel de Profesor ✅

**Objetivo:** Verificar que el panel de profesor sigue funcionando.

**Pasos:**
```
1. http://localhost:3000/teacher/DEMO-101
2. ✅ VERIFICAR:
   - Dashboard del profesor renderiza
   - Lista de estudiantes visible
   - Filtros de fecha funcionan
   - Export CSV funcional
```

**Resultado Esperado:**
- Panel de profesor sin cambios
- Funcionalidad intacta

---

## 🔀 Testing URLs Sueltas

### Test 7: /workshop/[id] (Acceso Directo) ✅

**Objetivo:** Verificar que `/workshop/[id]` funciona como standalone.

**Pasos:**
```
1. http://localhost:3000/workshop/BIO-001
2. ✅ VERIFICAR:
   - Taller carga sin errores
   - NO tiene sidebar (es esperado, vista limpia)
   - Muestra contenido del taller
   - Autonomía: 3/3 (default)
   - NO ejecuta diagnóstico (sesión anónima)
```

**Resultado Esperado:**
- Taller accesible directamente
- Vista "limpia" sin sidebar
- Funcional para compartir links directos

**Nota:** Este comportamiento es INTENCIONAL. `/workshop/[id]` es para:
- Profesores que comparten links directos
- Usuarios que no quieren el flujo completo del dashboard
- Embeds en otras plataformas

---

### Test 8: /dashboard (Dashboard Directo) ✅

**Objetivo:** Verificar que dashboard recuerda alias.

**Pasos:**
```
1. Limpiar localStorage
2. http://localhost:3000/dashboard
3. ✅ VERIFICAR:
   - Dashboard renderiza
   - Sin alias guardado, puede mostrar "Estudiante" genérico
4. Ahora hacer /join?t=DEMO-101 y poner alias "TestUser"
5. http://localhost:3000/dashboard
6. ✅ VERIFICAR:
   - Dashboard muestra "TestUser" en sidebar
```

**Resultado Esperado:**
- Dashboard funcional
- Alias persiste en localStorage
- Si no hay alias, usa genérico

**Nota:** Este es el comportamiento correcto. El alias se guarda en localStorage después de `/join`.

---

## 🔍 Testing de Regresión

### Test 9: Otras Páginas No Afectadas ✅

**Pasos:**
```
1. /missions
   ✅ VERIFICAR: Lista de misiones renderiza
   ✅ VERIFICAR: Cards clickeables
   ✅ VERIFICAR: Sidebar presente

2. /dashboard
   ✅ VERIFICAR: Dashboard stats visibles
   ✅ VERIFICAR: Sidebar presente

3. /teacher/DEMO-101
   ✅ VERIFICAR: Panel profesor funcional
   ✅ VERIFICAR: CSV export funcional
```

**Resultado Esperado:**
- Páginas no modificadas siguen funcionando
- Sin errores en consola

---

## 📊 Checklist Final

### ✅ Funcionalidades Core
- [ ] Diagnóstico ejecuta y personaliza
- [ ] Siempre 3 estrellas iniciales
- [ ] Andamio funciona sin bugs visuales
- [ ] Santuario se abre automáticamente
- [ ] Pregunta de aplicación aparece
- [ ] Solo 1 botón CTA en todo momento
- [ ] Biblioteca tiene sidebar

### ✅ Flujos Completos
- [ ] Estudiante: Diagnóstico → Taller → Complete
- [ ] Profesor: Dashboard → Ver estudiantes
- [ ] Navegación: Sidebar → Biblioteca → Misiones

### ✅ UX
- [ ] Sin feedback residual en andamio
- [ ] Botones claros y únicos
- [ ] Transiciones limpias
- [ ] Sin errores en consola

---

## 🐛 Errores Conocidos (Resueltos)

| Error | Status | Fix |
|-------|--------|-----|
| Card rojo persiste | ✅ RESUELTO | Limpiar feedback al activar andamio |
| 2 botones juntos | ✅ RESUELTO | Early return si paso completado |
| Biblioteca sin sidebar | ✅ RESUELTO | Añadir AppShell wrapper |
| 1 estrella inicial | ✅ RESUELTO | Hardcodear 3 estrellas en motor |

---

## 🚨 Qué Reportar si Falla

Si encuentras un bug, reporta:
1. **URL exacta** donde ocurrió
2. **Pasos para reproducir** (detallados)
3. **Resultado esperado** vs **resultado actual**
4. **Screenshot** si es posible
5. **Consola de errores** (F12 → Console)

---

## 📝 Notas Técnicas

### LocalStorage y Diagnóstico

**Por qué NO te pide diagnóstico:**
```javascript
// El hook verifica si ya tienes perfil guardado
const savedProfile = localStorage.getItem('adaptive_profile_...');
if (savedProfile) {
  // No ejecuta diagnóstico de nuevo
  return JSON.parse(savedProfile);
}
```

**Para forzar diagnóstico:**
```javascript
// En console
localStorage.removeItem('adaptive_profile_BIO-001_DEMO-101_<sessionId>');
location.reload();
```

### URLs y Roles

| URL | Rol | Sidebar | Diagnóstico |
|-----|-----|---------|-------------|
| `/demo/student?t=X` | Student | ✅ | ✅ |
| `/workshop/[id]` | Anónimo | ❌ | ❌ |
| `/missions` | Student | ✅ | N/A |
| `/biblioteca` | Student | ✅ | N/A |
| `/teacher/[token]` | Teacher | ❌ | N/A |

---

**🟢 Status:** Listo para Testing Manual Exhaustivo

**Tiempo estimado:** 15-20 minutos (todos los tests)

---

_"Los tests no mienten. Si falla, hay que arreglarlo. Si pasa, celebrarlo."_

— Equipo de QA, Celesta
