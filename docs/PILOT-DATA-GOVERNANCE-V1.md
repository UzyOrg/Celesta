# Gobierno de datos · Piloto cerrado V1

> Control operativo provisional para el piloto; no sustituye revisión jurídica.

## Antes de invitar a un alumno

- Obtener asentimiento del alumno y autorización de su madre, padre o tutor mediante el
  proceso externo del piloto. Registrar fecha y versión de este aviso.
- Usar únicamente códigos como `P01`; no poner nombres, teléfonos, correos o escuela en
  `class_token`, alias ni enlaces.
- Explicar que Celestea guarda respuestas escritas y eventos de uso para revisar si la
  actividad y su medición funcionan. El texto puede pasar por un clasificador de IA; la IA no
  redacta la lección ni decide por sí sola el resultado reportado del piloto.
- Pedir que no escriban datos personales dentro de las respuestas abiertas.

## Datos permitidos

- Código de participante y cohorte.
- Respuesta escrita, opción elegida, ayuda solicitada e intento.
- Versión de contenido, `studyId`, timestamps y estado técnico de entrega.
- Calificación humana y salida del clasificador, conservadas por separado.

No se graba voz en V1, no se registran cambios de pestaña y no se intenta detectar ayuda fuera
del producto.

## Acceso y uso

- El navegador solo escribe mediante los endpoints autorizados; nunca lee tablas crudas.
- El texto crudo se consulta únicamente con Service Role desde herramientas internas.
- La lista que relaciona `P01` con una persona, si existe, vive fuera de Celestea y no se copia
  a Supabase.
- Para n=5 y n=20–40, todas las producciones se califican humanamente. El scorer automático es
  apoyo operativo, no ground truth.

## Retención provisional

- Texto crudo y trazas por alumno: **90 días después del cierre de la cohorte**.
- Después: borrar texto y enlaces identificables; conservar solo métricas agregadas y ejemplos
  explícitamente anonimizados.
- Una solicitud de retiro detiene usos nuevos y dispara la eliminación de su `studyId` y código
  en la siguiente ventana operativa.

Antes de cada cohorte se registra: token, fecha de inicio, fecha de cierre, fecha programada de
borrado, responsable y confirmación de borrado. Cambiar estos plazos exige una decisión nueva,
no un cambio silencioso de código.

## Respuesta a incidentes

Si una prueba anónima de Supabase devuelve `200`, aparece texto real en logs o se comparte un
enlace equivocado:

1. detener nuevas invitaciones;
2. revocar acceso o secreto afectado;
3. preservar solo logs técnicos necesarios para investigar;
4. determinar participantes y datos alcanzados;
5. documentar corrección y autorización antes de reanudar.
