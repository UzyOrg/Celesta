> **Borrador para revisión de un abogado mexicano. No es asesoría legal.**

# Textos de consentimiento del alumno

Versión `2026-11-borrador-v1`. Estado: borrador del 2 de noviembre de 2026.
Aplica a la pantalla «Tres sí y seguimos» (`src/components/defensa/PantallaPermisos.tsx`) y a la hoja del aviso (`DialogoPrivacidad.tsx`).

## 1. Qué cambió en la app y qué no

**Cambió solo texto.** No cambió ninguna lógica, ninguna clave, ningún contrato con el servidor ni ninguna prueba de comportamiento.

| Dónde | Antes (`2026-10-v1`) | Ahora (`2026-11-borrador-v1`) |
| --- | --- | --- |
| Interruptor 1 (`avisoPrivacidad`) | Leí el aviso de privacidad | Leí el aviso de privacidad y acepto que usen mi trabajo, mi voz (si hablo) y mis respuestas en mi defensa, y que mi profesor reciba el reporte. |
| Interruptor 2 (`transferenciaInternacional`) | Acepto que mis datos se procesen en EE. UU. | Acepto que mis datos se procesen con proveedores fuera de México, sobre todo en EE. UU. |
| Interruptor 3 (`mayorDeEdad`) | Soy mayor de edad | Soy mayor de edad (tengo 18 años o más). |
| Garantía bajo los interruptores | Nunca entrenamos IA con tus datos. | Celestea no vende tus datos ni entrena IA con ellos. |
| Ayuda bajo los interruptores | Activa los tres para seguir. | Activa los tres para seguir. Si prefieres no hacerlo, tu trabajo cuenta igual y tu profesor te ofrece otra forma de mostrar lo que sabes. |
| Hoja «Aviso de privacidad» | Cuatro puntos de ejemplo | Ocho puntos del aviso simplificado (`aviso-privacidad-simplificado.md`) |
| `AVISO_PRIVACIDAD_VERSION` (`src/lib/defensa/config.ts`) | `2026-10-v1` | `2026-11-borrador-v1` |

No se tocó: el título «Tres sí y seguimos.» (lo usan las pruebas y `pasos.ts`), los nombres de los tres campos (`avisoPrivacidad`, `transferenciaInternacional`, `mayorDeEdad`), los tres valores de `tipo` de `defensa_consentimientos` ni el orden. Tampoco el mecanismo: los tres empiezan apagados y hay que activarlos para seguir.

Una prueba de unidades fijaba la cadena `'2026-10-v1'`; ahora importa la constante (`tests/unit/flujoEntrega.spec.ts`). Es un cambio de prueba, no de comportamiento.

### Por qué la versión lleva «borrador»

La versión queda grabada en cada consentimiento (`version_aviso`). Si un alumno real aceptara un texto que luego el abogado cambia, habría un consentimiento sobre un texto que ya no existe. La etiqueta hace visible que ese texto no está aprobado. **Al aprobar los textos hay que subir la versión** (por ejemplo `2026-12-v1`) y quitar la etiqueta.

## 2. Los tres consentimientos

### Interruptor 1 · Aviso y tratamiento principal

> «Leí el aviso de privacidad y acepto que usen mi trabajo, mi voz (si hablo) y mis respuestas en mi defensa, y que mi profesor reciba el reporte.»

- **Qué consiente:** el tratamiento principal (trabajo, voz si elige hablar, respuestas) y que el reporte, la transcripción y el trabajo lleguen al profesor.
- **Tipo de consentimiento:** expreso, por medio electrónico (art. 7). También es el consentimiento «expreso y por escrito» del art. 8 para los datos sensibles que lleguen a aparecer en el trabajo o en lo que diga, **si** el abogado acepta que un interruptor con constancia de versión y hora es un «mecanismo de autenticación» (pregunta 3).
- **Cláusula del art. 35:** dice si la persona titular acepta o no la transferencia al profesor: aquí la acepta.
- **Qué se informa al abrir el aviso:** quién es el responsable, qué datos, para qué, con quién, cuánto tiempo, derechos y cómo ejercerlos (`aviso-privacidad-simplificado.md`).
- **Si no se activa:** no se puede seguir. No se guarda nada (el servidor no crea la sesión hasta que los tres están en «sí»; `src/lib/defensa/servicios/acceso.ts`).

### Interruptor 2 · Proveedores fuera de México

> «Acepto que mis datos se procesen con proveedores fuera de México, sobre todo en EE. UU.»

- **Qué consiente:** que los proveedores de IA, voz, base de datos y alojamiento, que están en gran parte en Estados Unidos, traten sus datos por cuenta de Celestea.
- **Base legal:** los proveedores son encargados (art. 2, fr. XII) y su recepción de datos **no es una «transferencia»** según la ley (art. 2, fr. XX); no necesita consentimiento (Reglamento art. 53, de vigencia dudosa). Se mantiene el interruptor por transparencia y porque, si un proveedor usara los datos para sus fines, dejaría de ser un encargado. No debe decirse al alumno que el tratamiento sería ilícito sin este interruptor.
- **Se cambió «en EE. UU.» por «fuera de México, sobre todo en EE. UU.»** porque la región real de Supabase no está en el repo y el modelo puede procesar en otra región (`marco.md`, sección 10). Una frase que solo dice EE. UU. podría ser inexacta.
- **Si no se activa:** igual que el 1.

### Interruptor 3 · Mayoría de edad

> «Soy mayor de edad (tengo 18 años o más).»

- **Qué consiente:** es una **declaración**, no un consentimiento de tratamiento. Sin ella no se trata ningún dato.
- **Base:** la mayoría de edad comienza a los 18 años cumplidos (Código Civil Federal, art. 646; ✔ leído).
- **Límite:** es una declaración, no una comprobación. La universidad debe asegurar que sus alumnos sean mayores (`convenio-piloto.md`).
- **Si no se activa:** igual que el 1.

## 3. Evaluación: claro, corto y separable

| Criterio | Interruptor 1 | Interruptor 2 | Interruptor 3 |
| --- | --- | --- | --- |
| Corto | Largo (unos 140 caracteres) | Aceptable (unos 85) | Corto (unos 40) |
| Claro | Dice qué datos, para qué y quién los recibe | Dice qué y dónde | Sí |
| Separable | **No del todo**: mezcla «leí el aviso», «acepto el uso de mi voz y mis respuestas» y «mi profesor lo recibe» | Sí | Sí |

El primer interruptor junta tres cosas porque la pantalla tiene exactamente tres campos y el encargo pide no cambiar la lógica. Es una concesión. La estructura ideal es la siguiente.

### Estructura recomendada si se acepta tocar la lógica

Cinco interruptores, cada uno con un solo objeto, **todos separados y apagados al llegar**:

1. «Leí el aviso de privacidad.»
2. «Acepto que usen mi voz y mis respuestas para mi defensa.» (consentimiento expreso para el tratamiento principal y, por precaución, para la voz)
3. «Acepto que mi profesor reciba mi reporte, mi transcripción y mi trabajo.» (transferencia, art. 35)
4. «Acepto que mis datos se procesen con proveedores fuera de México, sobre todo en EE. UU.»
5. «Soy mayor de edad (tengo 18 años o más).»

Cambios de código que implica (fuera del encargo, para decidir con el fundador): ampliar la restricción `check` de `defensa_consentimientos.tipo` con una migración nueva, el contrato `consentimientos` de `contrato.ts`, la validación de `sesion/route.ts` y de `acceso.ts`, la pantalla, `useFlujoDefensa.ts` y las pruebas.

Alternativa sin código: dejar los tres interruptores y que el abogado confirme que la redacción actual basta.

## 4. Qué pasa si alguien no acepta

1. **No se guarda nada.** El servidor crea la sesión (y el alumno, y los consentimientos) solo cuando los tres están en «sí».
2. **Ven la ayuda de la pantalla:** «Si prefieres no hacerlo, tu trabajo cuenta igual y tu profesor te ofrece otra forma de mostrar lo que sabes.»
3. **El profesor ofrece una alternativa sin penalización.** Ejemplos: una defensa oral en vivo con el profesor, un breve ejercicio escrito en el aula, o una conversación en línea con el profesor. Lo decide el profesor. La alternativa debe ser comparable en esfuerzo.
4. **El trabajo ya cuenta como entregado.** La entrega es un acto separado de la defensa.
5. **El alumno no tiene que justificar su decisión** ni hablar con Celestea. Basta con decírselo al profesor.

Esta es la parte que hace *libre* el consentimiento (art. 2, fr. IV; Reglamento art. 12). Depende de que el profesor y la universidad la acepten por escrito: `convenio-piloto.md`, cláusula 7, y `terminos-profesor.md`, cláusula 4. **Sin eso, el texto de ayuda no debe mostrarse.**

### Mensaje tipo del profesor a sus alumnos

> Esta actividad incluye una defensa oral breve con Celestea, una inteligencia artificial. No te califica: yo leo un reporte y decido. Tu trabajo cuenta como entregado en cuanto lo subes, aunque la defensa falle. Puedes hablar o escribir. Hay una pantalla de permisos con el aviso de privacidad; si prefieres no usar Celestea, avísame y te propongo otra forma de mostrar lo que sabes, sin penalización.

## 5. Constancia del consentimiento

- **Qué se guarda:** en `defensa_consentimientos`: el alumno, el tipo (`aviso_privacidad`, `transferencia_internacional`, `mayor_de_edad`), la versión del aviso, si aceptó y la fecha y hora. Una fila por versión.
- **Qué no se guarda:** el texto exacto que se mostró. Se recupera por la versión.
- **Medida:** conservar los textos aprobados de cada versión en el repositorio y marcar con una etiqueta de git la versión que salió a producción. Así se puede demostrar qué leyó cada alumno (Reglamento art. 20: la carga de la prueba es del responsable).
- **Pendiente (B6):** cuánto conservar la constancia más allá de los 90 días.

## 6. Cambios de versión

- Cuando cambie el texto de forma importante (otra finalidad, otro proveedor que reciba datos, otro responsable) se sube `AVISO_PRIVACIDAD_VERSION`.
- Hoy el código registra el consentimiento **al crear la sesión** (que dura 48 horas). Un alumno con sesión ya abierta no vuelve a ver la pantalla. Eso no importa en el piloto, pero cualquier cambio importante a media cohorte exigiría una pantalla de reconfirmación (cambio de código, fuera del encargo).

## 7. Contenido de la hoja del aviso

Los ocho puntos están en [`aviso-privacidad-simplificado.md`](./aviso-privacidad-simplificado.md). Los datos del responsable quedan en cuatro constantes al inicio de `DialogoPrivacidad.tsx`: `RESPONSABLE`, `DOMICILIO`, `CORREO_PRIVACIDAD` y `AVISO_INTEGRAL`. Hoy dicen `[…]` de forma visible. Eso es a propósito: **mientras no se llenen, nadie debería usar datos reales**.

## 8. Qué NO se cubre con estos textos

- La aceptación de los **términos de uso**: no hay un interruptor para ellos (pregunta 6).
- La aceptación del **profesor** (aviso y términos): no hay pantalla (pregunta 8).
- El consentimiento para finalidades **secundarias**: no existen en el piloto.
- El perfil de **accesibilidad** (`defensa_perfiles`): no tiene pantalla; cuando la tenga, necesita consentimiento expreso aparte (dato posiblemente sensible).
