# 🧪 Guía de Testing — Celesta OS v1.0

## Inicio Rápido

```bash
# 1. Instalar dependencias (si no lo has hecho)
npm install

# 2. Verificar que el build compile
npm run build

# 3. Iniciar servidor de desarrollo
npm run dev

# 4. Abrir en navegador
http://localhost:3000
```

---

## 🎯 Flujos Clave a Probar

### 1. **Flujo del Estudiante con Application Shell**

#### Paso A: Registro de Alias
```
URL: http://localhost:3000/join?t=DEMO-101
```
- ✅ Debe mostrar formulario de alias
- ✅ Ingresar nombre (ej: "Maria")
- ✅ Click en "Continuar"
- ✅ Redirect automático a /demo/student

#### Paso B: Experiencia con el Shell
```
URL: http://localhost:3000/demo/student?t=DEMO-101
```
**Verificar:**
- ✅ **Sidebar izquierdo visible** con:
  - Logo "Celesta OS v1.0"
  - Navegación: Dashboard, Misiones, Biblioteca, Configuración
  - Perfil en footer con alias "Maria"
- ✅ **Toggle button** colapsa/expande sidebar
- ✅ **Indicador activo** en sección actual (gradiente turquoise)
- ✅ **Hover effects** en items de navegación

#### Paso C: InteractivePlayer Mejorado
**Verificar en el taller:**
- ✅ **Panel izquierdo** (Tarjeta de Misión):
  - Título "La Célula como Unidad de Vida"
  - Badges con iconos (GraduationCap, BookOpen, Clock)
  - Información del estudiante en turquoise
  - Barra de progreso animada
  - Estrellas de autonomía animadas
  - Ancla narrativa con icono Target

- ✅ **Panel derecho** (Espacio de Trabajo):
  - Indicador "Paso X de Y" con icono Sparkles
  - Transiciones suaves entre pasos
  - Opciones múltiples como **tarjetas premium**:
    - Border de 2px
    - Hover effects (scale, translateY)
    - Radio button customizado
    - Checkmark animado al ser correcta
    - X animado al ser incorrecta
    - Efecto de brillo en hover
  
- ✅ **Botón CTA principal**:
  - Gradiente turquoise → lime
  - Sombra colorida
  - Animaciones hover/tap
  - Label dinámico (Comenzar/Probar/Continuar)

- ✅ **Feedback visual**:
  - Toast notifications con AnimatePresence
  - Colores apropiados (verde/rojo/neutro)
  - Iconos CheckCircle2/XCircle

#### Paso D: Navegación desde Sidebar
```
1. Click en "Dashboard" → Debe navegar a /dashboard
2. Click en "Misiones" → Debe navegar a /missions
```

**En /dashboard:**
- ✅ 4 MetricCards con iconos
- ✅ Mensaje de bienvenida
- ✅ Sidebar permanece visible

**En /missions:**
- ✅ Card de BIO-001 con hover effect
- ✅ Click navega de vuelta al taller
- ✅ Cards placeholder para futuras misiones

---

### 2. **Flujo del Docente con Application Shell**

#### URL Inicial
```
http://localhost:3000/teacher/DEMO-101
```

**Verificar:**
- ✅ **Sidebar izquierdo** con perfil "Docente"
- ✅ **Header premium**:
  - Título con gradiente de texto
  - Grupo en color lime
  - Botones "Filtros" y "Exportar CSV"

- ✅ **4 MetricCards** en grid:
  1. Estudiantes Activos (turquoise, Users icon)
  2. Pasos Completados (lime, CheckCircle icon)
  3. Puntuación Promedio (blue, TrendingUp icon)
  4. Pistas Utilizadas (amber, Lightbulb icon)
  - Hover effect: translateY(-4px)
  - Iconos en círculos con gradiente

- ✅ **Radar Chart** en tarjeta premium:
  - Título "Indicadores de Desempeño"
  - Gráfico visible y animado
  - Altura de 400px

- ✅ **Lista de Estudiantes** como tarjetas:
  - Avatar con iniciales en gradiente
  - Nombre del estudiante
  - Pasos completados en grande (lime)
  - Hover effect muestra "Ver detalle" con ícono Eye
  - Click navega a detalle del estudiante
  - Animación escalonada de entrada

- ✅ **Filtros colapsables**:
  - Click en botón "Filtros" expande panel
  - Inputs de fecha (desde/hasta)
  - Input de taller ID
  - Botón "Aplicar" con gradiente

- ✅ **Export CSV**:
  - Click descarga archivo
  - Verificar que el CSV contenga datos

---

### 3. **Componentes de Paso Refactorizados**

#### A. Opción Múltiple (ya probado arriba)

#### B. Predicción
**Si el taller BIO-001 tiene paso de predicción:**
- ✅ Opciones como tarjetas con border lime (no turquoise)
- ✅ Placeholder en textarea mejorado
- ✅ Feedback en azul (no verde/rojo, es diagnóstico)
- ✅ Mensaje "Predicción registrada" con CheckCircle2

#### C. Pregunta Abierta Validada
**Si el taller tiene este tipo de paso:**
- ✅ Textarea grande (min-height 120px) con resize
- ✅ Focus border turquoise con ring
- ✅ Feedback verde (correcto) o ámbar (revisar)
- ✅ Pistas en tarjeta azul
- ✅ **Botón de Rescate** (si elegible):
  - Aparece en ámbar con icono LifeBuoy
  - Tarjeta explicativa arriba
  - Click consume estrella y completa paso

---

## 🎨 Validaciones Visuales

### Paleta de Colores Consistente
```
Verifica que se usen estos colores en toda la app:
- Primarios: Turquoise (#14b8a6), Lime (#84cc16)
- Neutros: neutral-950 → neutral-700
- Success: green-500/600
- Error: red-500/600
- Warning: amber-400/500
- Info: blue-400/500
```

### Tipografía Consistente
- Títulos principales: `text-3xl font-bold` con gradiente
- Subtítulos: `text-lg font-semibold text-neutral-100`
- Cuerpo: `text-base text-neutral-200`
- Labels: `text-sm font-medium text-neutral-400`

### Espaciado Consistente
- Gaps entre elementos: `gap-3`, `gap-4`, `gap-6`
- Padding en tarjetas: `p-4`, `p-6`
- Space-y en layouts: `space-y-4`, `space-y-6`

### Bordes y Sombras
- Tarjetas: `rounded-xl border-2`
- Containers: `rounded-2xl`
- Sombras: `shadow-lg`, `shadow-xl` con variantes coloridas

---

## 🐛 Bugs Conocidos a Verificar

### 1. Sintaxis InteractivePlayer
- Si el build falla, verificar que no haya cierres de `<div>` extra
- Los comentarios JSX deben estar bien indentados

### 2. Missing Imports
- Todos los componentes deben importar framer-motion
- Iconos de lucide-react deben estar importados

### 3. Layout Anidado
- El layout del teacher no debe entrar en conflicto con el root layout
- El layout del student debe usar `useSearchParams` correctamente

---

## ✅ Checklist de Testing Completo

### Application Shell
- [ ] Sidebar se muestra en todas las páginas
- [ ] Toggle button funciona
- [ ] Navegación actualiza URL
- [ ] Indicador activo se mueve con animación
- [ ] Perfil muestra alias correcto
- [ ] Logo y branding visibles

### Student Experience
- [ ] Alias se registra correctamente
- [ ] InteractivePlayer se ve premium
- [ ] Opciones múltiples son tarjetas interactivas
- [ ] Barra de progreso se anima
- [ ] Estrellas de autonomía se animan al perder
- [ ] Botón CTA tiene gradiente y animaciones
- [ ] Toast notifications aparecen correctamente

### Teacher Experience
- [ ] MetricCards muestran datos correctos
- [ ] Radar chart se renderiza
- [ ] Lista de estudiantes es interactiva
- [ ] Filtros se pueden aplicar
- [ ] Export CSV funciona
- [ ] Hover effects en tarjetas de estudiantes

### Responsividad
- [ ] Desktop (1920x1080): Layout de 3 columnas
- [ ] Laptop (1366x768): Layout de 2 columnas
- [ ] Tablet (768x1024): Grid colapsa a 1 columna
- [ ] Mobile (375x667): Sidebar oculto (futuro hamburger)

### Animaciones
- [ ] Transiciones suaves (0.2-0.4s)
- [ ] Spring animations en hover
- [ ] AnimatePresence en feedbacks
- [ ] Staggered animations en listas

### Performance
- [ ] Build compila sin errores
- [ ] No console errors en runtime
- [ ] Animaciones son fluidas (60fps)
- [ ] SSR logs siguen funcionando

---

## 🚀 Comandos de Verificación

```bash
# Verificar TypeScript
npm run typecheck

# Verificar lint
npm run lint

# Build de producción
npm run build

# Iniciar build de producción
npm run start
```

---

## 📝 Reportar Issues

Si encuentras un bug:
1. Anota la URL exacta
2. Screenshot del problema
3. Console errors (F12 → Console)
4. Pasos para reproducir
5. Navegador y OS

---

**Última actualización:** 2025-09-30  
**Versión:** Celesta OS v1.0  
**Status:** Ready for Testing ✅
