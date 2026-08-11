# ADR 0010 · `studyId` une D1→D7 y el servidor firma la puerta

- **Fecha:** 2026-08-10
- **Estado:** aceptada
- **Ámbito:** `/crear`, telemetría y `/api/crear/retest`

## Problema

La sesión expira a las 168 horas, el mismo instante en que vence D7. `localStorage` podía
perderse y `?retest=1` dependía precisamente de ese estado; cuando funcionaba, además borraba
la fecha y permitía abrir antes de tiempo.

## Decisión

- La llave longitudinal es `studyId`. `student_session_id` puede rotar.
- Al pasar a `waiting_retest`, un `completo_paso` lleva `milestone: day1_complete`.
- Ingest reemplaza `ts` con hora de recepción del servidor y conserva el reloj del dispositivo
  únicamente en `client_ts`. El servidor usa ese `ts`, suma 168 horas y firma un ticket HMAC con cohorte,
  participante opaco, `studyId`, lección, `notBefore` y expiración.
- `/crear#rt=<ticket>` verifica en servidor y reconstruye el estudio en un perfil limpio.
- `?retest=1` deja de conceder acceso. Solo existe bypass mediante variable de servidor para
  pruebas automatizadas.

## Consecuencia

Sin milestone no hay ticket; con ticket válido pero antes de `notBefore` se muestra la fecha
y no el instrumento. La proyección oficial se reconstruye desde eventos, no desde el ledger
local recuperado.
