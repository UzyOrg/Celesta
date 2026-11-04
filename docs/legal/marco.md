> **Borrador para revisión de un abogado mexicano. No es asesoría legal.**

# Marco legal del piloto de defensas orales

Versión 0.1 · 2 de noviembre de 2026 · Rama `Uziel/legal-mexico-delivery-c3f56f` (base `feat/defensas-backend`).
Todo dato del piloto es ficticio hasta que los avisos de este paquete estén revisados y publicados.

Este documento es la base de los otros nueve de `docs/legal/`. Aquí está lo que se verificó, lo que no, y las recomendaciones que se siguen de ello. Las preguntas que solo un abogado puede cerrar están en [`preguntas-para-abogado.md`](./preguntas-para-abogado.md).

## 0. Cómo leer las marcas

- **✔ Leído** = leído literalmente el 2026-11-02 en el texto consolidado oficial que publica la Cámara de Diputados (PDF, encabezado «TEXTO VIGENTE»). El Diario Oficial de la Federación (DOF) **no se pudo abrir** desde esta sesión (error de certificado del sitio), así que ninguna cita está cotejada contra el DOF. El abogado debe cotejarlas ahí.
- **[VERIFICAR]** = no pude confirmarlo en una fuente oficial. Puede venir de memoria, de una página que no cargó o de un resumen. No lo tomes como cierto.
- Las páginas de proveedores se leyeron el 2026-11-02 y cambian. Cada tabla dice qué página y qué fecha muestra.

## 1. Resumen

1. **Ley aplicable.** Es la *Ley Federal de Protección de Datos Personales en Posesión de los Particulares* (LFPDPPP) nueva, expedida como «Artículo Tercero» del decreto publicado en el DOF el **20 de marzo de 2025**. ✔ Abroga la de 5 de julio de 2010 (transitorio Segundo, fracción I). Entra en vigor «al día siguiente de su publicación» (transitorio Primero), es decir, el 21 de marzo de 2025 (cálculo mío). Su única reforma conocida es la del **14 de noviembre de 2025**, que solo toca el artículo 4 (supletoriedad procesal). ✔
2. **Autoridad.** Ya no es el INAI. Es la **Secretaría Anticorrupción y Buen Gobierno** (arts. 2, fracción XV, 38 y 39). ✔ Los transitorios Cuarto, Quinto y Décimo trasladan a esa Secretaría las funciones, el personal y los procedimientos de datos personales del INAI. ✔ No pude leer su página de datos personales de particulares, ni ningún trámite, criterio o lineamiento nuevo. [VERIFICAR]
3. **Reglamento.** Sigue publicado como vigente el *Reglamento* del 21 de diciembre de 2011 (Cámara de Diputados lo lista así; no aparece en su lista de abrogados; no aparece uno nuevo). ✔ Pero está escrito para la ley de 2010: cita artículos que hoy no coinciden y habla del «Instituto». El transitorio Décimo Segundo ordenó al Ejecutivo «expedir las adecuaciones correspondientes a los reglamentos» en 90 días naturales ✔; no encontré que lo haya hecho. **Si el Reglamento de 2011 sigue aplicando en lo que no contradiga la ley nueva es la pregunta 1 para el abogado.** Mientras tanto, este paquete lo usa como estándar de prudencia, no como norma segura.
4. **Rol recomendado para el piloto.** Celestea **responsable** de lo que trata dentro de su plataforma; la universidad (o el profesor) como **destinatario** del reporte y responsable de la evaluación académica. Variante «Celestea encargada» si la universidad la exige (ver sección 6).
5. **La voz.** Recomendación: no es dato biométrico ni sensible *por la forma en que se usa aquí* (solo se transcribe; no se identifica a nadie), pero se trata con las salvaguardas de un dato sensible porque el contenido de lo que se dice puede serlo. Medidas en la sección 7.
6. **La ley no prohíbe procesar en EE. UU.** Pide informar, que el receptor asuma las mismas obligaciones y, si hay una *transferencia* a un tercero, una cláusula en el aviso (arts. 35 y 36). ✔ Lo que importa es qué hace cada proveedor con los datos (sección 10).

### Lo que bloquea alumnos reales (hallazgos de esta revisión)

| # | Bloqueo | Por qué | Dónde |
| --- | --- | --- | --- |
| B1 | **ElevenLabs puede entrenar con el contenido por defecto.** | Su política (actualizada 2026-10-09) dice usar «Inputs & Outputs» para entrenar, con opt-out en la cuenta. El modo sin registro es solo Enterprise y, según mis notas del 27 de octubre, la cuenta del fundador es de pago por uso (no lo pude comprobar hoy). | Sección 10 |
| B2 | **El borrado a los 90 días de cerrar la cohorte no existe todavía.** | El aviso no puede prometer algo que el sistema no hace. | `docs/defensas/backend.md`; sección 13 |
| B3 | **Faltan datos del responsable.** | Nombre o razón social, domicilio y correo para derechos ARCO son obligatorios en el aviso (art. 15, fr. I y V). | `aviso-privacidad-*.md` |
| B4 | **No hay una alternativa definida para quien no acepta.** | Si un alumno no acepta, el profesor debe ofrecerle otra vía; sin eso el consentimiento no es libre. | `consentimientos.md`, `convenio-piloto.md` |
| B5 | **Sin plan de respuesta a vulneraciones.** | Hay que avisar a los titulares «de forma inmediata» (art. 19). | Sección 13 |
| B6 | **La retención de las pruebas de consentimiento no está decidida.** | La carga de la prueba es del responsable (Reglamento art. 20), pero los datos se borran a los 90 días. | `preguntas-para-abogado.md` |
| B7 | **Identidad al retomar la sesión.** | Con el enlace del grupo y la matrícula ajena se retoma la sesión de otra persona y se ve su trabajo (riesgo ya anotado en el repo). Es un riesgo de seguridad (art. 18). | `docs/defensas/revision-2026-10-14.md` |

## 2. Fuentes y estado de verificación

| Fuente | Qué se revisó | Estado |
| --- | --- | --- |
| LFPDPPP 2025, texto consolidado (Cámara de Diputados, `LFPDPPP.pdf`, «Última Reforma DOF 14-11-2025») | Artículos 1 a 64 y transitorios del decreto | ✔ Leído completo. No cotejado contra el DOF. |
| Reglamento de la LFPDPPP, «Nuevo Reglamento DOF 21-12-2011» (Cámara de Diputados, `Reg_LFPDPPP.pdf`) | Arts. 2, 11 a 17, 19 a 21, 23 a 27, 41 a 43, 49 a 55, 63 a 76 | ✔ Leído. Vigencia frente a la ley nueva: [VERIFICAR]. |
| Listas de leyes abrogadas y de reglamentos vigentes/abrogados (Cámara de Diputados) | Que la ley de 2010 consta como abrogada por «DOF 20/03/2025» y que el Reglamento de 2011 consta como vigente | ✔ Leído. Es fuente informativa; la oficial es el DOF. |
| DOF, edición del 20-03-2025 | Título, nota y número de edición del decreto | ✗ No se pudo abrir. [VERIFICAR] |
| Sitio de la Secretaría Anticorrupción y Buen Gobierno | Unidad que atiende particulares, trámite de denuncia o de solicitud de protección de derechos | ✗ Solo una frase («es ahora atribución de la Secretaría»). El enlace «Datos Personales» (`portal-transparencia.buengobierno.gob.mx/proteccion-de-datos-personales/`) no se leyó. [VERIFICAR] |
| Lineamientos del Aviso de Privacidad | Si siguen vigentes | ✗ No verificado. Recuerdo que se publicaron en el DOF en enero de 2013; no lo pude confirmar. [VERIFICAR] |
| Código Civil Federal (`CCF.pdf`, última reforma DOF 14-11-2025) | Art. 646 | ✔ «La mayor edad comienza a los dieciocho años cumplidos.» |
| Páginas de Anthropic, OpenAI, ElevenLabs, Supabase y Vercel | Retención, entrenamiento, región, DPA | Ver sección 10. OpenAI: dos páginas dieron 403. |

## 3. Qué dice la ley, artículo por artículo (✔ todo leído)

| Tema | Artículo | Lo que dice (resumen; entre comillas, texto literal) | Qué implica para Celestea |
| --- | --- | --- | --- |
| Definiciones | 2 | **Datos sensibles** (fr. VI): los que «afecten a la esfera más íntima» o cuyo mal uso pueda causar «discriminación» o «un riesgo grave». Enunciativa: origen racial o étnico, salud presente o futuro, información genética, creencias religiosas, filosóficas y morales, opiniones políticas y preferencia sexual. **No lista la voz ni los biométricos.** **Persona encargada** (fr. XII): quien trata datos «por cuenta del responsable». **Transferencia** (fr. XX): comunicación «a persona distinta de la titular, del responsable o de la persona encargada». **Días** (fr. VIII): «días hábiles». | Los proveedores que tratan por cuenta de Celestea son encargados, no destinatarios de una transferencia. Todos los plazos en días son hábiles. |
| Principios | 5 a 14 | Licitud, finalidad, lealtad, consentimiento, calidad, proporcionalidad, información y responsabilidad (art. 5). Si hay una finalidad distinta a las del aviso, «se requerirá obtener nuevamente el consentimiento» (art. 11). Para datos sensibles, limitar el tratamiento «al mínimo indispensable» (art. 12). El responsable debe garantizar que el aviso se respete «por él o por terceros con los que guarde alguna relación jurídica» (art. 13). | Los proveedores deben respetar el aviso. Por eso el entrenamiento de ElevenLabs es un problema (B1). |
| Consentimiento | 7 a 9 | Todo tratamiento requiere consentimiento, salvo excepciones. Expreso (verbal, escrito, electrónico, signos inequívocos) o tácito (el aviso estuvo a disposición y no hubo oposición). Regla general: tácito. **Sensibles: «consentimiento expreso y por escrito»**, con firma autógrafa, firma electrónica «o cualquier mecanismo de autenticación que al efecto se establezca» (art. 8). Revocable «en cualquier momento sin efectos retroactivos»; el aviso debe decir cómo (art. 7). Excepciones del art. 9, entre ellas la fr. III (disociación) y la fr. IV (relación jurídica entre titular y responsable). | Los tres interruptores son consentimiento expreso por medio electrónico. Las estadísticas disociadas no necesitan consentimiento (art. 9, fr. III). |
| Retención | 10, 24 | Suprimir lo que ya no sea necesario, «previo bloqueo». La cancelación abre un periodo de bloqueo igual al plazo de prescripción de las acciones derivadas de la relación jurídica (art. 24). | Pregunta abierta B6: cuánto conservar como prueba. |
| Aviso | 14 a 17 | Contenido mínimo del aviso (art. 15): identidad y domicilio del responsable; datos tratados, identificando los sensibles; finalidades, distinguiendo las que requieren consentimiento; opciones para limitar el uso o la divulgación; mecanismos ARCO; y cómo se comunicarán los cambios. Cuando los datos se obtienen por medios electrónicos, se da la modalidad **simplificada** (fracs. I a IV del art. 15) y se señala dónde está el integral (art. 16, fr. II). | `aviso-privacidad-alumno.md` y `aviso-privacidad-simplificado.md`. |
| Seguridad | 18 a 20 | Medidas «administrativas, técnicas y físicas». No menores a las que se usan para la propia información. Se pondera riesgo, sensibilidad y desarrollo tecnológico (art. 18). Las vulneraciones que afecten «de forma significativa los derechos patrimoniales o morales» se informan a los titulares «de forma inmediata» (art. 19). Confidencialidad que subsiste tras la relación (art. 20). | Se necesita un plan de incidentes (B5). Hoy el único empleado es el fundador. |
| ARCO | 21 a 34 | Acceso, rectificación, cancelación y oposición. El responsable designa a una persona o departamento para tramitarlos (art. 29). Responde en **20 días hábiles** y lo hace efectivo en los **15 siguientes**; ampliable una vez por un periodo igual (art. 31). Es **gratuito**; solo se cobran reproducción o envío (art. 34). Causas de negativa en el art. 33. | Un correo y un procedimiento de 20+15 días. |
| Oposición a decisiones automatizadas | 26, fr. II | El titular puede oponerse a un tratamiento automatizado que produzca efectos jurídicos no deseados o afecte «de manera significativa» sus intereses y esté destinado a evaluar, **«sin intervención humana»**, aspectos personales como su «rendimiento profesional» o «comportamiento». | La IA no califica y el profesor decide: es la defensa de diseño más importante. Está en términos y avisos. |
| Transferencias | 35 y 36 | Si se transfieren datos a terceros «nacionales o extranjeros, distintos de la persona encargada», hay que comunicarles el aviso, y el aviso debe contener «una cláusula en la que se indique si la persona titular acepta o no la transferencia»; el receptor asume las mismas obligaciones (art. 35). No hace falta consentimiento en los siete supuestos del art. 36 (ley o tratado; salud; mismo grupo; contrato en interés del titular; interés público; defensa de un derecho; relación jurídica entre responsable y titular). | El reporte que recibe el profesor es una transferencia nacional si Celestea es responsable (sección 6). |
| Autorregulación | 37 | Esquemas vinculantes: códigos, sellos de confianza. | Posible vía de credibilidad más adelante; no es obligatorio. |
| Autoridad y procedimientos | 38 a 57 | La Secretaría vigila, resuelve procedimientos de protección de derechos y de verificación e impone sanciones. La solicitud de protección de derechos se presenta ante ella **dentro de los 15 días siguientes** a la respuesta (art. 40). Resuelve en 50 días, ampliables (art. 42). Verificación de oficio o a petición (art. 54). | El aviso informa al alumno que puede acudir a la Secretaría. |
| Infracciones | 58 a 60 | Entre otras: omitir elementos del aviso (fr. V), tratar datos contra los principios (fr. IV), transferir sin comunicar el aviso (fr. X), vulnerar la seguridad (fr. XI), transferir sin consentimiento expreso cuando es exigible (fr. XIII). Multas de **100 a 160,000 UMA** (frs. II a VII) y de **200 a 320,000 UMA** (frs. VIII a XVIII). En reincidencia, multa adicional de 100 a 320,000 UMA. En datos sensibles, «hasta por dos veces» los montos. Se pondera la naturaleza del dato, la intención, la capacidad económica y la reincidencia (art. 60). | El valor de la UMA vigente no lo verifiqué: [VERIFICAR] (INEGI lo publica cada enero). |
| Delitos | 62 a 64 | Vulneración de seguridad con ánimo de lucro: 3 meses a 3 años de prisión. Tratamiento mediante engaño para obtener lucro indebido: 6 meses a 5 años. Las penas se duplican en datos sensibles. | No aplican al piloto en condiciones normales; sirven para dimensionar qué tan en serio se toma una vulneración con fin de lucro. |
| Supletoriedad | 4 | Código Nacional de Procedimientos Civiles y Familiares y Ley Federal de Procedimiento Administrativo. | Reforma del 14-11-2025. |

## 4. Autoridad

- **Secretaría Anticorrupción y Buen Gobierno** (art. 2, fr. XV). ✔
- Sus atribuciones incluyen «conocer y resolver los procedimientos de protección de derechos y de verificación» e imponer sanciones (art. 39, fr. VI) y «elaborar estudios de impacto sobre la privacidad» de nuevas modalidades de tratamiento (fr. IX). ✔ La ley **no obliga** a un particular a hacer una evaluación de impacto; esa fracción es una facultad de la autoridad.
- «Transparencia para el Pueblo» recibe lo relativo al acceso a la información pública (transitorio Noveno), no los datos personales de particulares. ✔
- Los asuntos de datos personales que estaban ante el INAI pasaron a la Secretaría (transitorio Décimo). ✔

## 5. El Reglamento de 2011 hoy

- ✔ Aparece como «TEXTO VIGENTE», sin reformas, publicado el 21 de diciembre de 2011.
- ✔ Está armado sobre la numeración de la ley abrogada (por ejemplo, remite a «el artículo 3 de la Ley» para las definiciones y al «artículo 37» para las excepciones a la transferencia) y habla del «Instituto».
- ✔ El transitorio Décimo Segundo manda al Ejecutivo a adecuar los reglamentos en 90 días naturales; no encontré uno nuevo, pero no pude revisar el DOF. [VERIFICAR]
- **Postura de este paquete:** donde el Reglamento da una regla útil y razonable y la ley nueva no la contradice, se sigue *como buena práctica* y se marca. Son las siguientes:
  - consentimiento «libre, específico e informado» (art. 12) y carga de la prueba en el responsable (arts. 20 y 31);
  - revocación por «mecanismos sencillos y gratuitos» y por el mismo medio por el que se otorgó (art. 21);
  - aviso «sencillo… en lenguaje claro» (art. 24);
  - el encargado trata solo conforme a instrucciones, no para fines propios, con confidencialidad, supresión al terminar y sin transferir (art. 50); relación con el responsable por contrato (art. 51); subcontratación autorizada (arts. 54 y 55);
  - criterios para servicios en la nube (art. 52);
  - remisiones entre responsable y encargado sin consentimiento (arts. 2, fr. IX, y 53); si el encargado usa los datos para otra finalidad, «será considerado responsable» (art. 53);
  - contenido de la notificación de una vulneración (art. 65);
  - transferencias internacionales «cuando el receptor… asuma las mismas obligaciones» y se formalicen por cláusulas (arts. 74 y 75).

## 6. Rol de Celestea: ¿responsable o encargada?

### Lo que dice el texto

La ley de 2025 define al **responsable** de forma circular: son los «sujetos regulados», es decir, las «personas físicas o morales de carácter privado que llevan a cabo el tratamiento de datos personales» (art. 2, frs. XIV y XVI). ✔ La persona **encargada** es quien trata «por cuenta del responsable» (fr. XII). ✔ El criterio de la ley anterior, «decide sobre el tratamiento», no aparece en las definiciones que leí. Si la Secretaría sigue usando un criterio funcional (quién decide fines y medios) es una pregunta para el abogado. [VERIFICAR]

### Los hechos del piloto

- El alumno **entra a la plataforma de Celestea**, acepta los consentimientos de Celestea y entrega ahí su trabajo.
- Celestea decide qué se guarda, por cuánto tiempo, qué proveedores intervienen y qué hace la IA.
- La universidad decide usar la herramienta, pero no recibe una lista de alumnos de la que Celestea tome datos: los alumnos teclean su nombre y matrícula.
- Celestea tiene finalidades propias: evaluar si la defensa no estresa y si el reporte le sirve al profesor.
- Un profesor puede usar Celestea por su cuenta, sin que su universidad lo haya autorizado.

### Recomendación para el piloto

**Celestea, responsable de los datos que trata en su plataforma.** La universidad (o el profesor que la usa por su cuenta) queda como **destinatario** del reporte y como responsable independiente de su relación académica con el alumno y de lo que haga con el reporte.

Por qué:
1. Encaja con los hechos: el alumno trata directamente con Celestea y Celestea decide los medios.
2. Es el único esquema que funciona **igual** con una universidad y con un profesor que llegó por su cuenta.
3. No depende de que una universidad adopte un aviso propio y gestione consentimientos; en un piloto de 90 días eso decide si hay piloto.
4. Las finalidades de evaluación del piloto son de Celestea, no de la universidad.

Qué cuesta:
1. Celestea asume sola las obligaciones de responsable (aviso, ARCO, seguridad, sanciones de los arts. 58 y 59).
2. El reporte que recibe el profesor es una **transferencia** (art. 2, fr. XX): el aviso debe incluir la cláusula del art. 35. Está en `aviso-privacidad-alumno.md` y en el primer interruptor.
3. Hay un problema de **libertad del consentimiento** entre alumno y profesor (sección 11). Se mitiga con la alternativa obligatoria del convenio y de los términos del profesor.

### Cuándo cambiar a «Celestea encargada»

Si una universidad privada contrata formalmente a Celestea y exige ser la responsable, se usa el **Anexo B de `convenio-piloto.md`**: la universidad es responsable y su aviso rige; Celestea trata solo por su cuenta y conforme a sus instrucciones (Reglamento arts. 50 a 55). Celestea sigue siendo responsable de lo que decide por sí misma (por ejemplo, el análisis agregado del piloto), y el convenio debe decirlo.

### Profesor que lo usa por su cuenta

Se aplica el mismo esquema. El profesor acepta `terminos-profesor.md`, declara que puede usar la herramienta con sus alumnos y se obliga a ofrecer una alternativa. Que un profesor pueda imponer una herramienta a sus alumnos sin la autorización de su institución no lo puedo afirmar: [VERIFICAR]. Recomendación operativa para el piloto: pedir el visto bueno de la coordinación por escrito (basta un correo) o que el uso sea voluntario para el alumno.

### Universidad pública

La ley aplicable a una universidad pública es la que rige a los sujetos obligados (la Ley General de Protección de Datos Personales en Posesión de Sujetos Obligados, expedida en el mismo decreto; es el «Artículo Segundo» y no lo leí). Este paquete **no cubre** ese caso. [VERIFICAR]

## 7. La voz

### Pregunta

¿Cuenta la voz como dato biométrico o sensible cuando solo se transcribe y no se identifica a nadie?

### Qué dice la ley

- El art. 2, fr. VI define los datos sensibles por sus efectos («esfera más íntima», «discriminación», «riesgo grave») y da una lista que es **«enunciativa más no limitativa»**. ✔ La voz no está en la lista. En el texto completo de la ley no aparecen las palabras «biométrico», «voz», «audio», «huella» ni «inteligencia artificial» (búsqueda en el texto extraído). ✔
- La ley no regula la voz, la grabación de audio, ni la inferencia de emociones. No encontré un criterio de la Secretaría sobre el tema. [VERIFICAR]
- El consentimiento para datos sensibles debe ser «expreso y por escrito» y se admite una «firma electrónica» o «cualquier mecanismo de autenticación» (art. 8). El Reglamento (art. 19) acepta, en entorno digital, «cualquier mecanismo o procedimiento que… permita identificar al titular y recabar su consentimiento». ✔ (vigencia del Reglamento: [VERIFICAR]).

### Recomendación

1. **La grabación de voz es un dato personal** (hace identificable a una persona) **y no es, por sí misma, un dato biométrico ni sensible en este uso**: Celestea no crea huella de voz, no verifica ni identifica hablantes y no infiere emociones, salud o estrés a partir del audio. La transcripción convierte el audio en texto.
2. **Pero el contenido sí puede ser sensible.** Un alumno puede decir en voz alta algo sobre su salud, su religión o su política. Y el audio, en manos de un tercero, *podría* usarse para crear una huella de voz: eso sería un uso distinto, y habría que prohibirlo por contrato.
3. Por prudencia, **tratar el audio con las salvaguardas de un dato sensible**, sin declararlo sensible:
   - consentimiento expreso por un interruptor propio, no tácito (primer interruptor de `consentimientos.md`);
   - retención mínima: **7 días** y las partes sueltas se borran al transcribir (ya implementado, `docs/defensas/backend.md`);
   - ninguna creación, almacenamiento ni uso de huella de voz, clonación de voz ni identificación de hablantes, por Celestea ni por proveedores (contrato y ajustes de cuenta);
   - ningún análisis de emociones, de estrés ni de «detección de IA» sobre el audio;
   - el profesor solo oye la frase que el alumno marcó o aclaró (ya implementado, ADR 0014);
   - siempre se puede escribir en lugar de hablar (ya implementado);
   - sin cámara, sin imagen (ya implementado);
   - el aviso lo dice con claridad.
4. **Por qué no declararla sensible:** la clasificación la hace la ley por efectos, no por tipo de dato; declarar sensible todo el audio obliga a justificar la base de datos (art. 8, segundo párrafo), a reducir el periodo de tratamiento (art. 12) y, ante una infracción, expone a multas de hasta el doble (art. 59, fr. IV) sin una ganancia real en protección. **Por qué sí tomar las salvaguardas:** el costo es bajo y, si la Secretaría o un juez opinaran que sí lo es, el piloto ya cumpliría.
5. **Si Celestea llegara a identificar a la persona por su voz** (por ejemplo para evitar suplantación), la conclusión cambia: eso sería un tratamiento biométrico. No está en el piloto y requiere nuevo análisis.

Este es el punto 2 de las preguntas para el abogado.

## 8. Datos sensibles que aparecen sin pedirlos

- Celestea **no solicita** datos sensibles. Pero el trabajo del alumno, su respuesta hablada o escrita y el texto que pega pueden mencionarlos.
- El **perfil de accesibilidad** (`defensa_perfiles`: región y `accesibilidad`) existe en la base y no tiene pantalla. Si se activa, la accesibilidad puede revelar salud: **tratar como sensible** y pedir consentimiento expreso aparte antes de construir esa pantalla.
- La **pregunta de estrés** (escala 0 a 4, comparada con un examen escrito, que se puede omitir) es una autoevaluación de percepción. No la considero dato de salud, pero es un dato sobre el estado emocional. Va dentro del consentimiento expreso.
- Medida común: el aviso advierte que no hay que poner datos sensibles si no hacen falta, y el consentimiento expreso cubre los que aparezcan.

## 9. Decisiones automatizadas e IA

- La IA hace tres cosas: arma un plan de preguntas a partir del trabajo, clasifica cada respuesta en una clase fija y propone un reporte que el código revisa (cada cita debe aparecer literalmente). No califica (ADR 0014).
- El art. 26, fr. II da derecho de oposición al tratamiento automatizado que evalúe «sin intervención humana». ✔ La defensa de diseño es que **una persona decide**: el profesor lee, no es una calificación automática, y los términos le prohíben usar el reporte como única base.
- La ley no tiene artículos sobre inteligencia artificial, perfilamiento ni portabilidad (no aparecen en el texto que leí). ✔
- Aviso de que se conversa con una IA: no lo exige la ley que leí, pero lo exigen los términos de este paquete y es parte del consentimiento informado (art. 7: consentimiento «informado», art. 2, fr. IV).

## 10. Transferencias y remisiones nacionales e internacionales

### Qué exige la ley

- **Remisión** (término del Reglamento, art. 2, fr. IX): comunicación entre el responsable y su encargado. El Reglamento dice que no requiere informar al titular ni su consentimiento (art. 53). ✔ [VERIFICAR vigencia]. La ley de 2025 no usa la palabra «remisión»: trata al encargado como una figura (art. 2, fr. XII) y excluye al encargado de la definición de «transferencia» (fr. XX).
- **Transferencia** (art. 35): a un tercero distinto del encargado. Hay que comunicarle el aviso, incluir en el aviso la cláusula de aceptación o no, y el receptor asume las mismas obligaciones.
- **Internacional:** la ley **no tiene un régimen separado**. Los arts. 35 y 36 hablan de terceros «nacionales o extranjeros» y de transferencias «nacionales o internacionales», sin decisiones de adecuación ni cláusulas tipo. ✔ El Reglamento sí pide que el receptor asuma las mismas obligaciones y que se formalice con cláusulas u otro instrumento (arts. 74 y 75). [VERIFICAR vigencia]
- **Nube:** el Reglamento (art. 52) solo permite servicios de nube sujetos a condiciones generales cuando el proveedor, entre otras cosas, tiene políticas afines a los principios de la ley, transparenta las subcontrataciones, no asume la propiedad de la información, guarda confidencialidad, permite limitar el tratamiento, mantiene medidas de seguridad, garantiza la supresión al terminar y evita el acceso de personas sin privilegios. ✔ [VERIFICAR vigencia]

### Consecuencias prácticas

- Los cinco proveedores actúan por cuenta de Celestea: son **encargados** (art. 2, fr. XII). El segundo interruptor («proveedores fuera de México») **no es la base legal** de esa remisión; es transparencia y refuerzo. La recomendación es mantenerlo, pero no usarlo para afirmar que sin él el tratamiento es ilícito.
- **Si un proveedor usa los datos para fines propios** (entrenar sus modelos, por ejemplo), deja de ser un mero encargado: Reglamento art. 53, «será considerado responsable». Eso convierte el envío en una transferencia que exige el aviso, la cláusula y, por el art. 13, que el aviso se respete. Por eso B1 es un bloqueo.
- El alumno debe poder saber, en lenguaje llano, **qué proveedor recibe qué**.

### Qué recibe cada proveedor (según el código y `docs/defensas/backend.md`)

| Proveedor | Para qué | Qué le llega |
| --- | --- | --- |
| Anthropic (o, si se elige, OpenAI) | Plan de preguntas, clasificador de respuestas, reporte | Texto del trabajo, consigna y rúbrica del profesor, transcripciones y respuestas. El código no manda el nombre ni la matrícula como campos y el prompt del reporte pide no nombrar al alumno (`reporte.ts`), pero el texto del trabajo (portada, encabezados) puede traerlos. |
| ElevenLabs | Transcribir el audio (Scribe) y crear la voz de Celestea | Audio del alumno (transcripción). Texto de las preguntas (voz), que puede citar fragmentos del trabajo. |
| Supabase | Base de datos y archivos | Todo lo anterior, guardado. |
| Vercel | Alojamiento y ejecución del servidor | Todo lo que pasa por el servidor, en tránsito; registros técnicos. |

### Qué revisar de cada proveedor, y qué mostraron las páginas el 2026-11-02

Retención, entrenamiento y región. Las citas están en inglés como en la fuente. «No se leyó» significa que la página no cargó o no mostró el contenido.

| Proveedor | Retención | Entrenamiento | Región | DPA y transferencias | Qué hacer antes de alumnos reales |
| --- | --- | --- | --- | --- | --- |
| **Anthropic** (API) | Dos páginas oficiales **no coinciden**. La de retención de la API dice que el contenido «is not retained by default», salvo los *Covered Models* (Fable 5, Fable 5.1, Mythos 5, Mythos 5.1), que «require 30-day data retention». El Centro de Privacidad (1 de julio de 2026) dice que borra entradas y salidas «within 30 days». Retención cero solo por acuerdo con ventas; no aplica a los *Covered Models*. Contenido marcado: hasta 2 años. | Términos Comerciales (vigentes desde 17-jun-2025): «Anthropic may not train models on Customer Content from Services». Los *Outputs* son del cliente. | Parámetro `inference_geo` por solicitud: `"us"` o `"global"`; **por defecto `"global"`**. Con `"us"` el precio es 1.1x. | DPA (vigente desde 24-feb-2025): cláusulas contractuales tipo módulos 2 y 3; ley irlandesa; subencargados en `anthropic.com/subprocessors` (**no se leyó**). | Confirmar por escrito cuál es la retención real. Decidir `inference_geo`. El código no lo fija (no hay `inference_geo` en `src/lib/defensa/`). Verificar que el modelo elegido no sea un *Covered Model*. |
| **OpenAI** (si se elige) | Registros de abuso hasta 30 días por defecto (`your-data`). Retención cero con aprobación previa de OpenAI y no en todos los endpoints. | «data sent to the OpenAI API is not used to train or improve OpenAI models». | Procesamiento regional en EE. UU. y UE para clientes elegibles; fuera de ahí, aprobaciones y enmienda. | **No se leyó** (403 en `business-data` y en el DPA). | Leer el DPA y su lista de subencargados antes de elegirlo. El código usa `store: false` (`llm.ts`). |
| **ElevenLabs** (voz y transcripción) | «Customers by default have history preservation enabled». Borrar por API quita audio y texto de la base, pero «debugging and moderation logs may still retain data». Respaldos hasta 30 días. **Modo de retención cero: solo Enterprise** («select enterprise customers»); cubre `/v1/text-to-speech/` y `/v1/speech-to-text/` por solicitud con `enable_logging=false`. | Su política de privacidad (9-oct-2026): «We use your personal information to research, build, train and improve our AI models», con *opt-out* en «Data use». Dice que no cubre lo que se procesa para un cliente empresarial, cuyo contrato rige. Ayuda: «By default, we don't train on any data from our Enterprise customers». **El valor por defecto para una cuenta que no es Enterprise y usa la API no está confirmado.** | Estándar: EE. UU. Aislados (UE, India, Singapur): solo Enterprise. «Processing may nevertheless occur outside of the selected location». | DPA (8-abr-2026): trata solo con instrucciones documentadas (§3.1); cláusulas tipo; no menciona entrenamiento; no dice si hay que firmarlo. Subencargados: la página **no mostró la lista**. | **B1.** Con la cuenta actual (de pago por uso, según mis notas), el modo sin registro **no está disponible** (`stt.ts` ya lo advierte). Opciones: (a) apagar «Improve the models for everyone» y obtener confirmación escrita de ElevenLabs para tráfico por API; (b) pasar a Enterprise; (c) usar otro transcriptor que el código ya soporta (Deepgram `mip_opt_out`). Mientras tanto, **no publicar** la frase «Nunca entrenamos IA con tus datos» sin matiz. |
| **Supabase** | Al borrar el proyecto, datos borrados en 30 días. Respaldos: «vary by plan». Cuenta cerrada: hasta 60 días. | No aparece en lo leído. | «You choose the region». Base, autenticación, almacenamiento y respaldos quedan ahí; cuenta, soporte, telemetría (registros en centros de la UE) y CDN del almacenamiento se procesan fuera. **No hay región en México**; la única de Latinoamérica es `sa-east-1` (São Paulo); el resto son de EE. UU., Canadá y otras. | DPA (versión del 1-ago-2026): forma parte de los Términos; «acceptance of the Agreement shall have the same effect as signing the SCCs» (§12.2). Transferencias a Singapur y EE. UU. con cláusulas tipo. Lista de subencargados: PDF **no legible**. | Anotar la región real del proyecto (no está en el repo). Confirmar la retención de respaldos, que afecta la frase «el audio se borra a los 7 días». |
| **Vercel** | Sin plazo publicado para registros. | En Hobby y Pro: «we may disclose de-identified information… to AI business partners… including training»; se desactiva en ajustes del equipo. | Funciones en Washington D. C. (`iad1`) por defecto en proyectos nuevos; se puede cambiar. | DPA (17-mar-2026): se vuelve vinculante «upon Customer entering into the Agreement»; alcance «Enterprise and Pro plans». Tratamiento principal en EE. UU. | Confirmar el plan (el DPA no nombra el plan Hobby) y desactivar el uso para entrenamiento en los ajustes del equipo. Que el plan Hobby sea solo para uso personal es algo que recuerdo; no lo verifiqué. [VERIFICAR] |

### Lo que se debe lograr de cada proveedor (lista de control)

1. Trata solo conforme a instrucciones documentadas y no para fines propios (Reglamento, art. 50).
2. No usa el contenido para entrenar, **incluida la cuenta real que usa Celestea** (no solo el plan Enterprise).
3. Retención conocida, por escrito, con plazo en días y qué pasa con respaldos y registros.
4. Región de procesamiento conocida y, si es posible, fijada.
5. DPA aceptado (o firmado) por Celestea, guardado en `docs/legal/` o fuera del repo, con la lista de subencargados.
6. Mecanismo de borrado a petición (borrar el audio y el texto de su historial por API).
7. Aviso de cambios en sus políticas (Reglamento, art. 52, fr. II, inciso a).
8. Mantener esta tabla al día cada vez que cambie un proveedor o su plan.

## 11. Consentimiento y alternativa

- El consentimiento debe ser «libre, específico e informado» (art. 2, fr. IV; Reglamento art. 12). ✔
- **Riesgo:** quien depende de la calificación del profesor puede sentir que no puede negarse. Eso debilita el consentimiento libre, sobre todo si la defensa es obligatoria para calificar.
- **Mitigación del piloto:**
  1. el trabajo **cuenta como entregado** desde que llega, aunque la defensa falle o el alumno no acepte (ya está en el diseño);
  2. el profesor se compromete por escrito a ofrecer **otra forma de mostrar lo que sabe** sin Celestea y sin penalización (convenio y términos del profesor);
  3. el texto de la pantalla de consentimiento lo dice al alumno (`consentimientos.md`);
  4. siempre se puede escribir en lugar de hablar.
- Este tema es la pregunta 4.

## 12. Edad

- Mayoría de edad a los **dieciocho años cumplidos** (Código Civil Federal, art. 646). ✔
- La ley de datos que leí **no trae reglas especiales para menores** (no aparecen en los arts. 1 a 64). El Reglamento remite las solicitudes ARCO de menores a las reglas de representación del Código Civil Federal (art. 89 del Reglamento). ✔ (vigencia: [VERIFICAR]).
- El piloto es con licenciatura y el alumno confirma «soy mayor de edad». Es una **declaración**, no una comprobación. Si un menor mintiera, el riesgo está en que Celestea trataría datos de un menor sin la autorización de sus padres. La universidad debe asegurar que sus alumnos sean mayores (convenio). Para bachillerato es otro análisis (checklist, prioridad 2).

## 13. Matriz de cumplimiento

| Obligación | Artículo | Estado hoy | Acción |
| --- | --- | --- | --- |
| Aviso integral y simplificado con todos los elementos | 15, 16 | Borrador listo en este paquete | Completar los datos del responsable (B3); revisión del abogado |
| Mecanismo para ejercer ARCO, persona designada | 21 a 34, 29 | Sin correo, sin procedimiento | Crear correo, designar persona (el fundador), registro de solicitudes con fechas |
| Medio de revocación del consentimiento | 7 | Solo en el aviso (borrador) | Mismo correo. Procedimiento para dejar de tratar y borrar |
| Cláusula de aceptación de la transferencia al profesor | 35 | Primer interruptor + aviso | Revisión del abogado |
| Medidas de seguridad | 18 | Base cerrada al navegador, enlaces firmados, sin cámara | Cubrir B7 (retomar sesión). Documentar las medidas (inventario) |
| Aviso de vulneraciones | 19; Reglamento 64 y 65 | No existe plan | Redactar un plan de una página: qué es un incidente, quién decide, texto tipo de aviso con los cinco elementos (naturaleza, datos comprometidos, recomendaciones, acciones, dónde obtener más información) |
| Supresión previo bloqueo | 10, 24 | Audio sí (7 días). Resto no implementado | Implementar el borrado a 90 días (B2) y decidir la prueba de consentimiento (B6) |
| Contratos con encargados | Reglamento 51 | Aceptación de DPA en línea; sin copia guardada | Guardar los DPA aceptados; lista de subencargados |
| Confidencialidad | 20 | Un solo operador | Acuerdo de confidencialidad con cualquier colaborador futuro |
| Atención a la Secretaría | 54 a 57 | n/a | Conservar evidencia de consentimientos (versión del aviso, fecha) — ya se guarda en `defensa_consentimientos` |
| Oposición a decisiones automatizadas | 26, fr. II | Diseño con intervención humana | Términos del profesor y avisos lo dicen |

## 14. Exposición

Multa máxima por una infracción de las más graves: 320,000 UMA, que puede duplicarse en datos sensibles (art. 59, fr. IV). El valor de la UMA lo debe verificar el abogado o el contador. Sin ese número no cuantifico. La Secretaría pondera la capacidad económica del responsable (art. 60, fr. IV). Para un piloto de un solo fundador, el riesgo práctico no es la multa máxima sino: (a) un alumno que presente una solicitud de protección de derechos o una queja; (b) una universidad que retire el apoyo; (c) la pérdida de credibilidad frente a futuros compradores. Todo eso se reduce con el aviso, la alternativa y el borrado real.

## 15. Dónde choca `AGENTS.md` con el ADR 0014, y cuál se siguió

El encargo ordena seguir el ADR 0014 en esta superficie y anotar la desviación. Para el trabajo legal importan estos puntos:

| Tema | `AGENTS.md` | ADR 0014 (borrador, sin aprobar) | Se siguió |
| --- | --- | --- | --- |
| Producto | B2C para estudiantes de prepa; «no somos un tablero para profesores» | Superficie de defensas con pantalla para el profesor, acotada a leer y descargar | ADR |
| Voz | v1: salida por voz; entrada del alumno en **texto** | Se guarda la voz del alumno 7 días | ADR (por eso hay una sección de voz) |
| Telemetría | `trackEvent` puede llevar `texto` bruto del alumno | Eventos de defensa **sin texto** del alumno | ADR (el aviso dice que los eventos de uso no llevan texto) |
| Identidad | `session.ts` y `alias.ts` | Sesión firmada propia | ADR |
| Menores | Estudiantes de prepa | Pendiente: «¿los participantes son mayores de edad?» | Licenciatura, mayores de edad (encargo); prepa en prioridad 2 |

El ADR 0014 **sigue en borrador**. Si el fundador no lo aprueba, hay que revisar las secciones 7 y 9 de este documento y los avisos.

## 16. Lo que no cubre este paquete

- Universidades públicas (ley distinta). 
- Cualquier uso con datos reales antes de la revisión del abogado.
- Menores de edad.
- Tratamiento de huella de voz, cámara o cualquier biométrico.
- Regímenes extranjeros (por ejemplo, alumnos de otro país que entren desde el extranjero). [VERIFICAR] si el piloto admite alumnos fuera de México.
