# 🎓 Student Insight Panel - Feature Documentation

**PR:** `feat(teacher): build student insight panel`  
**Fecha:** 5 de octubre de 2025  
**Arquitecto:** Principal Engineer  

---

## 🎯 Propuesta de Valor

**Para el docente:** Ver no solo **qué respondió** un alumno, sino **cómo llegó** a esa respuesta.

Esta feature materializa la promesa central de Celesta: revelar el "viaje de aprendizaje" completo de cada estudiante, mostrando su esfuerzo, estrategias y reflexión paso a paso.

---

## 📦 Archivos Creados

### Backend (API)
1. **`src/app/api/student/insights/route.ts`**
   - Endpoint: `GET /api/student/insights?class_token=XXX&student_alias=YYY`
   - Retorna: Todos los eventos `completo_paso` de un estudiante
   - Métricas agregadas: tiempo total, autonomía, intentos, pistas, etc.
   - Rate limit: 30 requests/min por IP

### Tipos
2. **`src/types/student-insights.ts`**
   - `StepCompletionEvent`: Estructura de evento completo_paso
   - `StepResult`: Métricas de esfuerzo y respuesta
   - `StudentJourneyMetrics`: Métricas agregadas
   - `StudentInsightsResponse`: Respuesta del API

### Componentes UI
3. **`src/components/insights/StepCard.tsx`**
   - Tarjeta individual de paso completado
   - Muestra: intentos, pistas, andamios, tiempo, respuesta final
   - Tarjeta especial para reflexión final (con glow effect)

4. **`src/components/insights/StudentInsightModal.tsx`**
   - Modal fullscreen con el viaje de aprendizaje completo
   - Header con métricas globales (autonomía, tiempo total, fecha)
   - Lista vertical de StepCards

### Integración
5. **`src/components/grupos/ApprovedStudentsList.tsx`** (MODIFICADO)
   - Tarjetas de estudiantes ahora son clickeables
   - Hover effect: "Ver Viaje de Aprendizaje"
   - Callback `onStudentClick` para abrir modal

6. **`src/app/(dashboard)/grupos/[classToken]/page.tsx`** (MODIFICADO)
   - Estado del modal (selectedStudent, isInsightModalOpen)
   - Handlers: handleStudentClick, handleCloseInsightModal
   - Renderiza StudentInsightModal

---

## 🏗️ Arquitectura de Datos

### Flujo de Datos

```
1. Usuario hace clic en estudiante aprobado
   ↓
2. handleStudentClick(student) se ejecuta
   ↓
3. Se abre StudentInsightModal
   ↓
4. Modal hace fetch a /api/student/insights?class_token=XXX&student_alias=YYY
   ↓
5. API consulta Supabase: eventos_de_aprendizaje WHERE verbo='completo_paso'
   ↓
6. API calcula métricas agregadas (calculateMetrics)
   ↓
7. Modal renderiza:
   - Header con métricas globales
   - StepCard por cada evento (en orden cronológico)
   - Tarjeta especial para reflexión final
```

### Estructura de Evento completo_paso

```typescript
{
  id: 123,
  student_session_id: "uuid",
  student_alias: "Juan Pérez",
  class_token: "CIENCIAS-101",
  taller_id: "hipotesis-peces",
  paso_id: "paso_4",
  verbo: "completo_paso",
  result: {
    paso_id: "paso_4",
    paso_titulo: "Nueva Hipótesis",
    intentos_fallidos: 2,
    pistas_usadas: 1,
    ayuda_andamio_usada: false,
    tiempo_en_paso_segundos: 120,
    respuesta_final: "Los peces se mueven...",
    es_correcta: true,
    autonomia_estrellas: 4,
    tipo_pregunta: "open_ended"
  },
  ts: "2025-01-05T14:30:00Z"
}
```

---

## 🎨 Diseño UI/UX

### Principios de Diseño
1. **Denso pero escaneable**: Mucha información, pero visualmente organizada
2. **Narrativa visual**: El docente "lee" el viaje del estudiante de arriba a abajo
3. **Jerarquía clara**: Reflexión final destacada con gradiente y glow
4. **Consistencia con Celesta OS**: Colores turquoise/lime, bordes sutiles, backdrop blur

### Componentes Visuales

#### Header del Modal
- Avatar del estudiante (gradiente turquoise/lime)
- Nombre del estudiante (bold, grande)
- 4 métricas globales en grid:
  - ⭐ Autonomía Final (estrellas)
  - ⏱️ Tiempo Total
  - 📅 Fecha de Finalización
  - 📈 Total de Pasos

#### StepCard Estándar
- **Header:** Número de paso + título + estrellas de autonomía
- **Esfuerzo (grid 4 columnas):**
  - 🔁 Intentos Fallidos (rojo)
  - 💡 Pistas Usadas (amarillo)
  - 🏢 Andamio Usado (turquoise)
  - ⏱️ Tiempo en Paso (lime)
- **Respuesta Final:** Box con la respuesta del estudiante

#### StepCard de Reflexión (Especial)
- **Diseño único:** Gradiente turquoise/lime + border doble + glow effect
- **Header:** Ícono de mensaje + "Reflexión Final"
- **Confianza:** 5 estrellas (auto-evaluación del estudiante)
- **Reflexión:** Texto completo en comillas, estilo italic
- **El "Oro":** Este es el insight más valioso para el docente

---

## 📊 Métricas Calculadas

### Métricas Agregadas (StudentJourneyMetrics)

```typescript
{
  total_time_seconds: 1234,       // Suma de todos los pasos
  total_failed_attempts: 8,       // Suma de intentos_fallidos
  total_hints_used: 3,            // Suma de pistas_usadas
  total_scaffolds_used: 1,        // Count de ayuda_andamio_usada
  autonomy_stars: 4,              // Último valor de autonomia_estrellas
  completion_date: "2025-01-05",  // Timestamp del último evento
  total_steps: 12                 // Número de eventos completo_paso
}
```

### Lógica de Cálculo (calculateMetrics)

```typescript
function calculateMetrics(events: any[]) {
  let totalTime = 0;
  let totalIntentos = 0;
  let totalPistas = 0;
  let totalAndamios = 0;
  let autonomiaFinal = 5; // Default

  events.forEach((event) => {
    const result = event.result || {};
    
    totalTime += result.tiempo_en_paso_segundos || 0;
    totalIntentos += result.intentos_fallidos || 0;
    totalPistas += result.pistas_usadas || 0;
    
    if (result.ayuda_andamio_usada) {
      totalAndamios += 1;
    }
    
    if (result.autonomia_estrellas !== undefined) {
      autonomiaFinal = result.autonomia_estrellas;
    }
  });

  return { totalTime, totalIntentos, totalPistas, totalAndamios, autonomiaFinal };
}
```

---

## 🧪 Plan de Pruebas

### Prueba 1: Navegación Básica
1. ✅ Ir a `/grupos/[classToken]`
2. ✅ Verificar que las tarjetas de estudiantes muestren hover effect
3. ✅ Hacer clic en un estudiante aprobado
4. ✅ **Esperado:** Modal se abre con loading spinner

### Prueba 2: Visualización de Insights
1. ✅ Esperar a que carguen los datos
2. ✅ **Verificar Header:**
   - Nombre del estudiante visible
   - 4 métricas globales con valores
   - Estrellas de autonomía rellenadas correctamente
3. ✅ **Verificar Lista de Pasos:**
   - Pasos ordenados cronológicamente
   - Cada StepCard muestra 4 indicadores de esfuerzo
   - Respuesta final visible

### Prueba 3: Tarjeta de Reflexión
1. ✅ Scroll hasta el último paso
2. ✅ **Verificar diseño especial:**
   - Gradiente turquoise/lime visible
   - Glow effect alrededor de la tarjeta
   - Confianza (estrellas) visible
   - Texto de reflexión completo y legible

### Prueba 4: Interacciones
1. ✅ Hacer clic en X (cerrar modal)
2. ✅ **Esperado:** Modal se cierra, vuelve a lista de estudiantes
3. ✅ Hacer clic fuera del modal (backdrop)
4. ✅ **Esperado:** Modal se cierra
5. ✅ Presionar ESC
6. ✅ **Esperado:** Modal se cierra

### Prueba 5: Casos Edge
1. ✅ Abrir insight de estudiante sin eventos completo_paso
2. ✅ **Esperado:** Mensaje "No hay eventos de pasos completados"
3. ✅ Abrir insight mientras hay error de red
4. ✅ **Esperado:** Icono de error + mensaje descriptivo

---

## 🚀 Deploy Checklist

- [x] API endpoint creado y documentado
- [x] Rate limiting aplicado (30/min)
- [x] Tipos TypeScript completos
- [x] Componentes UI creados
- [x] Modal integrado en página de grupos
- [x] Hover effects y transiciones
- [x] Reflexión final con diseño especial
- [x] Manejo de estados de loading/error
- [x] Responsive design (funciona en mobile/tablet/desktop)

---

## 🎓 Ejemplos de Uso

### Docente María - Caso de Uso Real

**Contexto:** María es docente de Biología y acaba de terminar un taller sobre "Hipótesis de Peces" con su grupo BIOLOGIA-3A.

**Flujo:**

1. María entra a `/grupos/BIOLOGIA-3A`
2. Ve 28 estudiantes aprobados
3. Nota que "Carlos Ruiz" completó el taller hace 2 días
4. **Hace clic en la tarjeta de Carlos**
5. **Modal se abre** mostrando:
   - **Autonomía Final:** ⭐⭐⭐⭐⭐ (5/5) - ¡Excelente!
   - **Tiempo Total:** 45m
   - **12 pasos completados**

6. María escanea los pasos:
   - **Paso 4 (Nueva Hipótesis):**
     - 🔁 3 intentos fallidos
     - 💡 1 pista usada
     - ⏱️ 8m 30s (el que más tiempo le tomó)
     - **Respuesta:** "Los peces se mueven hacia donde hay más oxígeno porque necesitan respirar..."
   
   - **Paso 9 (Diseño Experimental):**
     - 🔁 0 intentos fallidos
     - 💡 0 pistas
     - 🏢 Andamio usado ✅
     - **Respuesta:** Seleccionó las 3 variables correctas

   - **Paso 12 (Reflexión Final):** ✨
     - **Confianza:** ⭐⭐⭐⭐ (4/5)
     - **Reflexión:** _"Aprendí que las hipótesis deben ser específicas y medibles. Al principio pensé que cualquier idea funcionaba, pero ahora entiendo que debo pensar en cómo probarla antes de proponerla."_

7. **Insight del docente:**
   - Carlos luchó con el paso 4 (formulación de hipótesis)
   - Usó el andamio en el paso 9 (decisión inteligente)
   - Su reflexión muestra **metacognición real** (el objetivo del taller)
   - Autonomía 5/5 refleja que completó sin ayuda excesiva

---

## 🔒 Seguridad

### Rate Limiting
- **Endpoint:** `/api/student/insights`
- **Límite:** 30 requests/min por IP
- **Justificación:** El docente puede abrir 30 insights diferentes en 1 minuto (más que suficiente)

### Autorización
- **Estado actual:** Solo requiere `class_token` y `student_alias`
- **TODO:** Verificar que el docente autenticado sea dueño del `class_token`
- **Añadir en siguiente PR:**
  ```typescript
  // Verificar que el teacher_id del token autenticado
  // coincida con el teacher_id del class_token
  const { data: { user } } = await supabase.auth.getUser();
  // ... verificar ownership
  ```

---

## 📈 Métricas de Éxito

### KPIs de Adopción (Semana 1)
- [ ] 80% de docentes abren al menos 1 insight
- [ ] Promedio de 5 insights vistos por docente por sesión
- [ ] Tiempo promedio en modal: 2-3 minutos

### KPIs de Valor (Mes 1)
- [ ] Docentes reportan "insights útiles" en surveys
- [ ] Docentes usan insights para ajustar enseñanza
- [ ] Conversaciones docente-estudiante más específicas

---

## 🛠️ Trabajo Futuro

### Mejoras Inmediatas (Próximo Sprint)
1. **Autenticación docente** en API endpoint
2. **Export PDF** del insight completo
3. **Comparación** entre estudiantes (side-by-side)

### Mejoras Mediano Plazo
4. **Filtros:** Ver solo pasos con >X intentos fallidos
5. **Highlights:** Destacar pasos problemáticos automáticamente
6. **Timeline visual:** Gráfico de tiempo por paso
7. **Anotaciones:** Docente puede agregar notas privadas

### Innovaciones Largo Plazo
8. **IA Generativa:** "Resumen narrativo" del viaje del estudiante
9. **Recomendaciones:** "Este estudiante necesita refuerzo en..."
10. **Predicción:** Alertas tempranas de estudiantes en riesgo

---

## 🎉 Conclusión

Esta feature representa **el corazón de Celesta**: transformar datos de aprendizaje en **narrativas humanas** que empoderan a los docentes.

**Antes de Celesta:**
- Docente ve: "Carlos completó el taller ✅"

**Con Student Insight Panel:**
- Docente ve:
  - Dónde luchó Carlos
  - Qué estrategias usó
  - Cómo piensa sobre su propio aprendizaje
  - **El viaje completo, no solo el destino**

---

**Status:** ✅ FEATURE COMPLETA  
**Ready for Testing:** SÍ  
**Ready for Production:** Pendiente testing + auth docente  

**Built with ❤️ by the Celesta Team**
