> **Borrador para revisión de un abogado mexicano. No es asesoría legal.**

# Aviso de privacidad simplificado · Alumnas y alumnos

Versión del texto: `2026-11-borrador-v1`. Es el resumen que se muestra en la pantalla de permisos (hoja «Aviso de privacidad», `src/components/defensa/DialogoPrivacidad.tsx`). El texto completo es [`aviso-privacidad-alumno.md`](./aviso-privacidad-alumno.md).

## Qué exige la ley para esta modalidad

Cuando los datos se obtienen por un medio electrónico, el aviso se da en su modalidad **simplificada**, que debe contener «al menos» la información de las fracciones I a IV del artículo 15 y señalar el sitio donde se puede consultar el integral (LFPDPPP, art. 16, fr. II; ✔ leído en el texto consolidado de la Cámara de Diputados, 2026-11-02):

| Fracción del art. 15 | Qué es | Dónde está abajo |
| --- | --- | --- |
| I | Identidad y domicilio del responsable | Punto 1 |
| II | Datos tratados, identificando los sensibles | Punto 2 |
| III | Finalidades, distinguiendo las que requieren consentimiento | Punto 3 |
| IV | Opciones y medios para limitar el uso o la divulgación | Punto 7 |
| (art. 16) | Sitio del aviso integral | Punto 8 |

El Reglamento de 2011 (art. 27) pide además entregar «de manera inmediata» la identidad y el domicilio, las finalidades y el mecanismo para conocer el aviso. Su vigencia frente a la ley nueva es una pregunta abierta (`marco.md`, sección 5). El texto de abajo también lo cumple.

## Texto para la pantalla

Va en lenguaje llano, en segunda persona de «tú» (el registro que usa Celestea con los alumnos). Cada punto cabe en tres o cuatro líneas de teléfono.

**1. Quién trata tus datos**
Celestea, de **[NOMBRE LEGAL DEL RESPONSABLE]**, con domicilio en **[DOMICILIO]**.

**2. Qué datos**
Tu nombre y matrícula, tu trabajo, tu voz si eliges hablar, tus respuestas y, si quieres, cuánto estrés te dio. No usamos cámara. No te pedimos datos sensibles (salud, religión, política): no los pongas si no hacen falta. Si aparecen, los tratamos solo para tu defensa.

**3. Para qué**
Para hacer tu defensa y preparar el reporte de tu profesor. Nada más: sin publicidad. No hay ninguna finalidad que necesite un permiso extra.

**4. Quién lo recibe**
Tu profesor y tu universidad reciben tu reporte, tu transcripción y tu trabajo, y el audio solo de lo que marques. Proveedores de IA, voz y almacenamiento, muchos en EE. UU., tratan los datos por nuestra cuenta. Celestea no vende tus datos ni entrena IA con ellos.

**5. Cuánto tiempo**
Tu audio se borra a los 7 días. Lo demás, hasta 90 días después de que cierre el grupo.

**6. Esto es una IA**
Hablas con una inteligencia artificial. No te califica: decide tu profesor. Tu trabajo cuenta como entregado desde que llega.

**7. Tus derechos y cómo limitar el uso**
Puedes pedir ver, corregir, cancelar u oponerte al uso de tus datos, y retirar tu permiso, escribiendo a **[CORREO DE PRIVACIDAD]**. Es gratis. Puedes escribir en vez de hablar y omitir la pregunta del estrés.
Si no aceptas, tu trabajo cuenta igual y tu profesor te ofrece otra forma de mostrar lo que sabes.

**8. Aviso completo**
**[URL DEL AVISO INTEGRAL]**

*Borrador pendiente de revisión legal: úsalo solo con datos ficticios.*

## Notas

- El punto 4 dice «no entrenamos IA con ellos». En la pantalla se limita a lo que Celestea hace (ver la nota de `consentimientos.md`). La afirmación sobre los proveedores está condicionada a B1 (`marco.md`).
- Los datos entre corchetes están en cuatro constantes al inicio de `DialogoPrivacidad.tsx` (`RESPONSABLE`, `DOMICILIO`, `CORREO_PRIVACIDAD`, `AVISO_INTEGRAL`) para que el fundador los llene en un solo lugar.
- El texto se adaptó de la versión de ejemplo anterior (`2026-10-v1`), que decía «Lo único que se conserva es la transcripción», lo cual no es exacto: también se conservan el trabajo, el nombre y la matrícula.
- Se quitó «Tu ensayo es privado: nadie lo ve» de este resumen y quedó «tu profesor no ve tu ensayo» en el aviso integral. La píldora «Ensayo privado, nadie lo ve» de la pantalla del ensayo (`ui-prototipo.md`, línea 227) afirma más de lo que se puede garantizar: el ensayo también pasa por los proveedores. Se señala al abogado y al fundador; no se tocó (no es texto de consentimiento).
