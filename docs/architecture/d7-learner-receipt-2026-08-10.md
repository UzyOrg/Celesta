# Propuesta de arquitectura · Recibo del alumno al cerrar D7

- **Fecha:** 2026-08-10
- **Estado:** aprobada por el fundador en este hilo
- **Superficie:** estados de cierre de `/crear`
- **No toca:** JSON de la lección, copy narrado, audio, `content_version` ni contratos de telemetría

## Problema

El cierre del día 1 ya devuelve dos dimensiones al alumno, pero su comparación tipográfica
puede dibujar progreso cuando la forma ya estaba presente en el baseline. El cierre del día
7, en cambio, cae en un completado genérico y no devuelve la comparación que el regreso hizo
posible.

## Decisión

1. El recibo de D1 se nombra desde el alumno: **“Lo que hiciste hoy”**.
2. El arco D1 solo tiene jerarquía ascendente cuando el ledger muestra esta secuencia para
   `modal_form`: baseline observado y no demostrado → transferencia inmediata correcta,
   independiente y sin ayuda. `preexisting`, `mixed`, `unknown` y ausencia de logro se
   componen al mismo nivel.
3. El estado de completado de D7 se convierte en un recibo del alumno. Compara, por separado,
   `certainty_calibration` y `modal_form` entre el caso nuevo de D1 y D7. Distingue correcto
   sin ayuda, correcto con apoyo, por revisar y no disponible en el dispositivo.
4. El recibo muestra la frase escrita en D7 y un límite explícito: dos casos no permiten
   generalizar a cualquier tema o situación.
5. El artefacto pertenece primero al alumno. No se añade compartir automático, reporte
   parental ni generador de tarjeta; cualquier uso en entrevistas sigue requiriendo
   consentimiento y composición manual.

## Por qué es un estado de render y no un paso 14

La evidencia ya existe en `CrearStudyState.evidenceLedger`. Añadir un paso al JSON cambiaría
el instrumento congelado y abriría una decisión de versión/audio sin aportar una nueva
oportunidad de aprendizaje. El recibo es una proyección de observaciones ya asentadas, por lo
que vive en el estado de completado del runtime.

## Criterios de aceptación

- Un baseline correcto nunca produce pesos `before`/`now` ascendentes en D1.
- Un baseline observado e incorrecto seguido de transferencia independiente correcta sí los
  produce.
- Al terminar D7 aparecen las dos dimensiones, D1 y D7, la frase de D7 y el límite de la
  evidencia.
- La ausencia local de D1 en una reentrada por dispositivo limpio se muestra como “no
  disponible aquí”, no como fallo del alumno.
- No cambia ninguna versión de contenido o audio.
