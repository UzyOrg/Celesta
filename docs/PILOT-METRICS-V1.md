# Diccionario de métricas · Piloto Celestea v1

**Congelado:** 2026-08-11 para la lección 1.18.0, antes del primer participante real.

## Llaves y denominadores

- Participante: código opaco único dentro de la cohorte (`P01`, nunca nombre).
- Estudio longitudinal: `studyId`; `student_session_id` no une D1 con D7.
- Elegible D7: existe milestone servidor `day1_complete` para ese `studyId`.
- D7 ausente y baseline omitido son `desconocido`, nunca incorrecto.

## Instrumento

- Trazas completas: estudios con inicio, respuestas esperadas, cierre D1 y estado D7 / D1
  elegibles.
- Unión D1→D7: retests con el mismo `studyId` / retests recibidos.
- Texto preservado: producciones con texto crudo / producciones observadas.
- Condición preservada: observaciones con independencia/asistencia inequívoca / observaciones.
- Acuerdo de scoring: acuerdo humano-humano y humano-clasificador, por rama; el clasificador
  no es ground truth.

## Producto

- Inicio: `inicio_taller` único por `studyId`.
- Completion D1: milestone `day1_complete` / inicios.
- Bloqueo: participantes que requieren intervención del founder / inicios.
- Abandono: último paso observado por cada `studyId` incompleto.
- Fallo de audio y fallback visible se reportan aparte de aprendizaje.

## Aprendizaje

- Baseline: resumen de todos los ítems observados del constructo, no el primero mostrado.
- Forma con apoyo: primer intento en `guided-form`, con las piezas suministradas y
  `assisted: true`. Un acierto demuestra construcción por selección y orden; no demuestra
  recuperación ni producción independiente.
- Transferencia inmediata: primer intento independiente, caso nuevo, inmediato.
- D7: primer intento independiente, caso nuevo, diferido y autorizado por servidor.
- Se reportan transiciones individuales; no se colapsan constructos en un score.
- `supported_only` significa: baseline no demostrado + primer intento correcto en una
  oportunidad `supported` + ninguna transferencia independiente correcta. En
  `modal_form`, se debe leer literalmente como “construyó la secuencia correcta a partir de
  piezas suministradas”; nunca como “ya casi”, dominio o producción autónoma.
- `durable` significa evidencia compatible con capacidad en este ítem/condición, no dominio
  general ni causalidad de la lección.

## D7: tres cifras obligatorias

1. Cobertura = D7 válidos y unidos / D1 elegibles.
2. Desempeño observado = D7 correctos / D7 calificables.
3. Rendimiento de evidencia = D7 válido, unido, independiente y correcto / inicios D1.

La tercera cifra no se llama “porcentaje que aprendió”. El regreso se desglosa en orgánico,
recordatorio aceptado, recordatorio enviado, enlace abierto, retest iniciado y terminado.

## Mercado

- D1/D7: abrió probe → eligió objetivo → apartó lugar → aceptó recordatorio.
- Segundo reto: invitado → se presentó → terminó → volvió. Solo estos últimos comportamientos
  pueden acercarse a product pull.
- Pago: oferta vista → depósito; reportado por fuente de presupuesto:
  `reemplazo`, `complemento`, `gasto_nuevo` o `desconocido`.
- Una opinión positiva, un clic o un recordatorio manual no se reportan como retención.

## Gates precomprometidos

- Etapa 0 usable: 4/5 terminan D1 sin intervención ni confusión bloqueante.
- Preparar segundo reto: pasa el gate anterior; mantener oculto hasta D7.
- Señal B2C inicial: entre 10 padres calificados fuera del círculo cercano, 3 depósitos es
  fuerte, 1–2 ambiguo y 0 débil, siempre desglosados por origen del presupuesto y con acuerdo
  del adolescente.
