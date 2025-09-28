# Taller Cognitivo: Arquitectura de UI (Panel Único Inmersivo)

Este documento describe la nueva arquitectura del jugador del taller orientada a un panel único, de dos columnas, con un bucle socrático claro y un único CTA principal por paso.

## Layout general

- Columna izquierda (Contexto, ~35–40%):
  - Título y metadatos de la misión.
  - `MissionProgress` (progreso por pasos completados y autonomía ⭐).
  - El contenido del primer paso de `instruccion` (rol/escenario) se mantiene visible como ancla narrativa durante todo el taller.

- Columna derecha (Interacción, ~60–65%):
  - Encabezado con "Paso N de M".
  - Contenido dinámico del paso actual.
  - Barra de acciones del bucle socrático con un único CTA primario y, si aplica, botón de "Pedir pista".

Archivo principal: `src/components/workshop/InteractivePlayer.tsx`.

## Bucle socrático en la interfaz

Estados y CTA principal (global):
- Inicial: botón "Probar" (si el paso lo permite).
- Envío incorrecto: muestra feedback sutil (toast), el CTA cambia a "Reintentar".
- Pista: si el paso tiene `pistas`, aparece un botón secundario "Pedir pista (-X⭐)" que descuenta autonomía y muestra la pista.
- Envío correcto: feedback sutil de éxito; los inputs del paso se bloquean; el CTA muestra "Continuar" (o "Finalizar" en el último paso).

Nota: Los pasos integrados al CTA global exponen un controlador imperativo. De momento, el vertical slice incluye:
- `opcion_multiple`
- `pregunta_abierta_validada`

Otros tipos continúan con sus CTAs internos hasta ser migrados.

## Contrato de componentes de paso (StepController)

Archivo: `src/components/workshop/types.ts`

```ts
export type StepController = {
  submit: () => void;      // Ejecuta la validación/envío del paso
  canSubmit: () => boolean;// Indica si el CTA primario debe estar habilitado
  canAskHint?: () => boolean; // Indica si se puede pedir pista desde el CTA global
  askHint?: () => void;       // Invoca la lógica de pista del paso
};
```

Cada componente de paso que se integre al layout inmersivo recibe:
- `immersive?: boolean` para ocultar CTAs internos y dejar que el CTA global los gobierne.
- `exposeController?: (ctrl: StepController) => void` para entregar el controlador al `InteractivePlayer`.
- `onUiFeedback?: (text: string, kind: 'success' | 'info' | 'error') => void` para toasts sutiles.

Implementaciones actualizadas:
- `PasoOpcionMultiple.tsx`
- `PasoPreguntaAbierta.tsx`

Ajustes menores:
- `PasoInstruccion.tsx` admite `compact` y `hideAction` para ocultar texto/CTA cuando el layout inmersivo asume esa función.

## Progreso y autonomía

- `MissionProgress` ahora usa `completedSteps` para calcular porcentaje real.
- Las pistas descuentan estrellas de autonomía (`starsLeft`) y registran `solicito_pista`.

## Telemetría y alias

- `trackEvent` se mantiene como fuente de telemetría. Adjunta `result.alias` si existe en almacenamiento local por `class_token`.
- Tarea abierta: persistir alias de forma canónica en Supabase (leer/escribir) y minimizar dependencia de `localStorage`.

## Próximos pasos sugeridos

1) Integrar CTA global en pasos restantes (`observacion`, `prediccion`, `comparacion_experto`, `reexplicacion`, `transferencia`, `caza_errores`, `ordenar_pasos`, `confianza_reflexion`).
2) Añadir transiciones sutiles (fade/slide) al cambiar de paso en el panel derecho.
3) Afinar microcopys y estados vacíos.
4) Revisión de accesibilidad: foco después de error, roles ARIA en toasts, navegación con teclado.
