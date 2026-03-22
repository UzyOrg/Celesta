# Contexto de Arquitectura y UI para LLMs (Proyecto Celesta)

Este documento está diseñado para proporcionar a cualquier modelo de lenguaje (LLM) un resumen claro y estructurado del estado actual del proyecto, sus decisiones arquitectónicas y su sistema de diseño. Debe usarse como punto de referencia antes de proponer cambios estructurales o de UI.

## 1. Stack Tecnológico Principal
- **Framework:** Next.js 15 (App Router).
- **Lenguaje:** TypeScript.
- **Backend / BaaS:** Supabase (Autenticación, PostgreSQL, Row Level Security - RLS).
- **Estilado:** Tailwind CSS + CSS Modules (para estilos específicos complejos).
- **Animaciones:** Framer Motion + Tailwind Keyframes.
- **Iconografía:** Lucide React.
- **Validación y Formularios:** React Hook Form + Zod.
- **Visualización de Datos:** Nivo (`@nivo/radar`, `@nivo/core`).

## 2. Estructura del Proyecto (`/src`)

El proyecto sigue una arquitectura modular centrada en dominios dentro del App Router de Next.js:

- `/src/app`: Contiene las rutas de la aplicación y las API.
  - `(dashboard)`: Rutas protegidas para docentes (dashboard, grupos, biblioteca).
  - `/api`: Endpoints RESTful estructurados por dominio (analytics, events, groups, roster, teacher, etc.).
  - `/demo`, `/join`, `/workshop`: Flujos específicos para estudiantes y demostraciones.
- `/src/components`: Componentes de interfaz de usuario, categorizados por contexto:
  - Base: `Button.tsx`, `Input.tsx`, `Hero.tsx`, etc.
  - Dominio: `/teacher`, `/student`, `/workshop`, `/grupos`, `/join`, `/shell`.
  - Layouts y Skeletons: `/skeletons`, `PageContainer.tsx`, `AppShell.tsx`.
- `/src/lib`: Lógica central, clientes de servicios y utilidades funcionales.
  - `supabase/`: Clientes de Supabase (SSR y Client).
  - `workshops/`: Lógica de evaluación y estado de los talleres.
  - `rate-limit.ts`, `track.ts`: Telemetría y control de abusos.
- `/src/contexts`: Proveedores de contexto global (ej. `AuthContext.tsx`, `ThemeContext.tsx`).

## 3. Sistema de Diseño y Elementos Gráficos (UI)

El proyecto utiliza un tema predominantemente oscuro (Dark Mode por defecto) denominado **"Crystal Theme"**, diseñado para ser moderno, limpio y enfocado.

### Paleta de Colores (`tailwind.config.ts` & `globals.css`)
- **Fondo Base:** `#0D1117` (Oscuro profundo).
- **Acentos Crystal:**
  - `crystal-blue`: `#a7d8f5` (Azul suave/cristalino).
  - `crystal-lavender`: `#d9d2f7` (Lavanda suave).
  - `star-white`: `#f0f4f8` (Blanco estrella, para textos principales y contrastes altos).
- **Neutrales:** `neutral-100` (`#F7F9FA`), `neutral-200` (`#E3E8EE`).

### Tipografía
- **Principal:** `Plus Jakarta Sans` (Configurada como fuente por defecto en el `body`).
- **Alternativas / Headers:** `Clash Display`, `General Sans`.
- **Preferencias del usuario:** Se prefieren fuentes redondeadas, amigables, que diferencien bien los caracteres y no sean excesivamente delgadas o puntiagudas (ej. `Nunito` está disponible).

### Animaciones
Se hace un uso elegante de animaciones para mejorar la UX sin sobrecargarla:
- **Tailwind genéricas:** `fade-up`, `float`, `gradient`, `fadeGlow`.
- **Interacciones complejas:** Manejadas con `framer-motion` (ej. transiciones de página, modales, revelación de pasos en talleres).

## 4. Patrones de Desarrollo y Convenciones

- **Server vs Client Components:** Se prioriza el uso de Server Components para mejorar el rendimiento y el SEO. Se utiliza la directiva `"use client"` de forma granular, únicamente en los componentes hojas que requieren interactividad (hooks, eventos de usuario).
- **Obtención de Datos (Data Fetching):** Acceso directo a Supabase desde los Server Components o a través de las rutas de API en `/src/app/api` cuando el cliente necesita interactuar con el backend.
- **Seguridad (RLS):** Toda la obtención de datos respeta las políticas de Row Level Security de Supabase. Existe una separación clara entre las llamadas regulares y las que requieren el `service_role` (ej. ingestión de eventos de telemetría).
- **Experiencia de Usuario (UX):** Se utilizan componentes de carga (`skeletons`) para estados de espera y notificaciones interactivas (`react-hot-toast`) para feedback inmediato de las acciones del usuario.

## 5. Notas Importantes para la Toma de Decisiones del LLM
1. **Componentes Existentes:** Antes de crear un componente nuevo, verifica en `/src/components` si existe un análogo (ej. botones, modales, esqueletos de carga).
2. **Estilado Consistente:** Mantén el uso de las variables de Tailwind (ej. `text-crystal-blue`, `bg-base`) en lugar de colores hex crudos.
3. **Manejo de Errores:** Asegúrate de incluir el manejo de errores del lado del cliente y notificaciones amigables en los formularios y flujos de acción.
4. **Mobile-First:** Respeta las convenciones establecidas en los refactors previos de optimización "mobile-first". Las interfaces deben ser completamente funcionales en dispositivos móviles.
