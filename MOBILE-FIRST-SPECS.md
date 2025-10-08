# 📱 Mobile-First Design Specifications (Google Standards)

## 🎯 Typography Standards

### Font Sizes (Mobile-First)
Según Material Design y Web.dev de Google:

| Uso | Mobile (Base) | Desktop (Responsive) | Tailwind Class |
|-----|---------------|----------------------|----------------|
| **Body Text** | 12px (0.75rem) | 14px | `text-xs md:text-sm` |
| **Small Text** | 10px (0.625rem) | 12px | `text-[10px] md:text-xs` |
| **Labels** | 11px (0.6875rem) | 13px | `text-[11px] md:text-[13px]` |
| **Subtitles** | 13px (0.8125rem) | 15px | `text-[13px] md:text-[15px]` |
| **Headings H3** | 16px (1rem) | 18px | `text-base md:text-lg` |
| **Headings H2** | 18px (1.125rem) | 20px | `text-lg md:text-xl` |
| **Headings H1** | 20px (1.25rem) | 24px | `text-xl md:text-2xl` |

### Spacing Standards (Mobile-First)

| Elemento | Mobile | Desktop | Tailwind |
|----------|--------|---------|----------|
| **Padding Cards** | 12px | 16px | `p-3 md:p-4` |
| **Gap entre elementos** | 8px | 12px | `gap-2 md:gap-3` |
| **Margin entre secciones** | 16px | 24px | `my-4 md:my-6` |
| **Padding contenedor** | 16px | 24px | `px-4 md:px-6` |

### Touch Targets
- Mínimo: **48x48px** (recomendación Google)
- Botones: `min-h-[48px]` o `h-12`
- Iconos interactivos: `w-12 h-12 p-3`

---

## 🔧 Componentes a Optimizar

### Dashboard
- ✅ Cards de métricas: padding reducido en mobile
- ✅ Texto de stats: 12px en mobile
- ✅ Subtítulos: 10px en mobile

### Login/Signup
- ✅ Título: 20px → 24px (mobile → desktop)
- ✅ Inputs: altura 48px (touch target)
- ✅ Labels: 11px
- ✅ Padding: 16px en mobile

### Talleres (Workshop)
- ✅ Título del paso: 16px → 18px
- ✅ Texto del contenido: 12px → 14px
- ✅ Opciones: padding 12px → 16px
- ✅ Botones: altura mínima 48px

### Misiones
- ✅ Cards: padding 12px → 16px
- ✅ Títulos: 16px → 18px
- ✅ Descripciones: 12px → 14px

### Pre-Taller (JoinForm)
- ✅ Título: 18px → 20px
- ✅ Input de alias: 14px
- ✅ Padding: 16px mobile

---

## 📐 Clase Utility Mobile-First

```typescript
// Typography mobile-first
export const mobileTypography = {
  // Body text
  body: 'text-xs md:text-sm',           // 12px → 14px
  bodySmall: 'text-[10px] md:text-xs',  // 10px → 12px
  
  // Labels
  label: 'text-[11px] md:text-[13px]',  // 11px → 13px
  
  // Headings
  h1: 'text-xl md:text-2xl',            // 20px → 24px
  h2: 'text-lg md:text-xl',             // 18px → 20px
  h3: 'text-base md:text-lg',           // 16px → 18px
  
  // Stats/Metrics
  stat: 'text-2xl md:text-3xl',         // 24px → 30px
  statLabel: 'text-[10px] md:text-xs',  // 10px → 12px
};

// Spacing mobile-first
export const mobileSpacing = {
  cardPadding: 'p-3 md:p-4',            // 12px → 16px
  containerPadding: 'px-4 md:px-6',     // 16px → 24px
  gap: 'gap-2 md:gap-3',                // 8px → 12px
  marginSection: 'my-4 md:my-6',        // 16px → 24px
};

// Touch targets
export const touchTargets = {
  button: 'min-h-[48px]',
  icon: 'w-12 h-12 p-3',
  input: 'h-12',
};
```

---

## 🎨 Referencias Google

- [Material Design Typography](https://m3.material.io/styles/typography/overview)
- [Web.dev Responsive Typography](https://web.dev/responsive-web-design-basics/)
- [Touch Targets](https://web.dev/accessible-tap-targets/)

---

## ✅ Checklist de Optimización

- [ ] Dashboard (cards de métricas)
- [ ] Login/Signup
- [ ] Pre-taller (JoinForm)
- [ ] Talleres (todos los pasos)
- [ ] Misiones
- [ ] Grupos (docente)
- [ ] AppShell (sidebar)
- [ ] Modales
