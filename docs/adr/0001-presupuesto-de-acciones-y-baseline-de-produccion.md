# ADR 0001 · Presupuesto de acciones del día 1 y baseline de producción

- **Fecha:** 2026-08-06
- **Estado:** aceptada
- **Ámbito:** `CREAR-ENGLISH-DEDUCTION-V1` 1.12.0, pre-piloto (n≈5)
- **Origen:** orden de ejecución CREAR v2, §1.4 (P6). Aprobada por el fundador
  antes de construir, conforme a `AGENTS.md` §6.

## Contexto

`modal_form` solo se observaba después de toda la instrucción. Sin una medida
previa no se distingue "no sabía y aprendió" de "ya sabía". Con n≈5 y sin grupo
control, la medida pre es el único mecanismo de atribución que existe, y la
producción es la mitad más convincente de la evidencia.

El paso nuevo `precheck-production` sube el conteo de acciones del día 1 de
**10 a 12**: gate de autoeficacia + intento de producción.

Conteo verificado del día 1 con 1.12.0:
precheck 3 + **baseline 2** + contrast 1 + guided-map 3 + transfer 1 +
transfer-check 1 + transfer-production 1 = **12**.

## Decisión

**No se corta contenido todavía.**

El presupuesto de 10 acciones salió de la observación de un solo alumno.
Recortar contenido apoyándose en n=1 mientras se agrega una medición
justificada por n=1 es incoherente: las dos decisiones tienen la misma
evidencia y se cancelan.

En su lugar, **la fatiga se observa explícitamente en las cinco sesiones**:
dónde deja de leer, dónde responde sin mirar la pista, dónde pide terminar.

Si la fatiga aparece, el corte de v1.13 es **`transfer` (Elena)**. Es la única
observación que no aporta una celda única de evidencia: supported/same_case ya
está en `guided-map` e independent/new_case ya está en
`transfer-check-certainty`.

## Diseño aprobado del baseline

Dos partes en una sola pantalla:

- **Parte A · gate de autoeficacia.** Pregunta cerrada, dos botones grandes:
  *"¿Podrías escribir esto en inglés?"* → **Sí** / **Todavía no**.
- **Parte B · intento.** El campo de texto aparece **siempre**, sin importar la
  respuesta de A, con el encabezado *"Inténtalo como puedas. Esto no se
  califica."* y un botón secundario *"Todavía no sé cómo decirlo"* que envía
  vacío y avanza.

**El gate no bloquea el campo.** Un "Todavía no" suaviza el marco, no cierra la
puerta: el intento fallido previo a la instrucción mejora el aprendizaje
posterior (efecto pretesting), y bloquearlo le quita al alumno el beneficio y al
estudio el dato. El gate resuelve además un problema afectivo real: pedir
producción en inglés en la pantalla 3, antes de enseñar nada, arrancaría la
experiencia con un fracaso.

**Tres señales, no una:** lo que cree que puede (A), lo que produce (B), y si
abandona (el botón de omitir).

## Consecuencias

- El caso (Camila / pizarrón) es nuevo y no reaparece en ningún otro paso; un
  test lo verifica sobre el JSON completo.
- Es medida, no enseñanza: sin guía, sin clasificador y sin feedback
  correctivo. `validation.ts` rechaza un JSON que viole cualquiera de las tres.
- El texto se guarda crudo y se clasifica después, a mano.
- El gate reporta `correcto: false` en ambas ramas —no tiene respuesta
  correcta— y la señal vive en `rama`
  (`baseline_gate_yes` / `baseline_gate_no`). No entra al ledger de evidencia:
  creer que puedes escribir una frase no es evidencia de que puedas.
- El intento omitido usa una rama propia (`baseline_produccion_omitida`) en vez
  de depender de la ausencia de `texto`, para que la tercera señal sea contable
  sin inferencias frágiles.
- El baseline se paga con valor para el alumno, no solo con dato: la pantalla
  de cierre le devuelve su primera frase junto a la de hoy (ADR 0002).

## Desviación registrada

El diseño aprobado incluía un `caseArtifact` de tipo `board`. No se
implementó: `CinematicCaseArtifact` no tiene dibujo de pizarrón y su lienzo
tiene altura fija de ~9 rem, así que un `kind` desconocido dejaría un vacío
visible que además consume el espacio vertical que necesitan el gate y el
campo en 320×812. La pista vive en `display.body` y en la pregunta. Añadir el
artefacto —con su SVG— queda como deuda opcional.
