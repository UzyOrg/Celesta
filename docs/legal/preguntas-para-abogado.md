> **Borrador para revisión de un abogado mexicano. No es asesoría legal.**

# Preguntas para el abogado

Versión 0.1 · 2 de noviembre de 2026.

Lo que solo un abogado mexicano puede cerrar. Cada pregunta trae por qué importa, la postura provisional de este paquete y dónde está el análisis. Los números los citan los otros documentos de `docs/legal/`.

**Orden sugerido para la primera reunión:** 12, 2, 4, 3, 1, 14, 15. Con esas siete respuestas se pueden cerrar los avisos.

**Qué se le entrega al abogado:** los diez archivos de `docs/legal/`; los textos de pantalla (`PantallaPermisos.tsx`, `DialogoPrivacidad.tsx`); el ADR 0014 (borrador sin aprobar); `docs/defensas/backend.md`. No se le entregan datos reales: no hay.

---

# A · Antes de cualquier alumno real (prioridad 0)

### 1. ¿Sigue vigente el Reglamento de 2011 y qué hacemos con los lineamientos del aviso?
- **Por qué importa:** el *Reglamento* del 21-12-2011 figura como vigente en la Cámara de Diputados, pero está escrito para la ley de 2010 (cita artículos que ya no coinciden y habla del «Instituto»). El transitorio Décimo Segundo de la ley nueva ordenó adecuar los reglamentos en 90 días. No encontré uno nuevo. No sé si siguen vigentes los *Lineamientos del Aviso de Privacidad* (los recuerdo de 2013; no los verifiqué).
- **Postura provisional:** seguirlo como buena práctica en lo útil (encargado, nube, consentimiento libre, revocación) y marcarlo, sin apoyarse en él para lo que la ley nueva no dice.
- **Dónde:** `marco.md`, secciones 1 y 5.

### 2. ¿La voz es dato biométrico o sensible en este uso?
- **Por qué importa:** si lo fuera, se necesita consentimiento «expreso y por escrito» siempre, se justifica la base de datos y las multas pueden duplicarse (arts. 8, 12 y 59, fr. IV).
- **Postura provisional:** no lo es en este uso (se transcribe, no se identifica, no se infiere nada), pero se trata con las salvaguardas de uno sensible: consentimiento expreso, 7 días, sin huella de voz, sin análisis de emociones. La ley no menciona la voz ni los biométricos.
- **Pido que confirmes:** que no hay criterio de la Secretaría en contra; y si sugieres declarar la voz como sensible por prudencia.
- **Dónde:** `marco.md`, sección 7.

### 3. ¿Un interruptor con constancia de versión y hora cumple el «consentimiento expreso y por escrito» del art. 8?
- **Por qué importa:** el art. 8 acepta «firma electrónica… o cualquier mecanismo de autenticación que al efecto se establezca», y no sé qué mecanismo se estableció. El Reglamento (art. 19) acepta mecanismos digitales que «permitan identificar al titular». El alumno se identifica con nombre y matrícula, sin verificación.
- **Postura provisional:** suficiente para el piloto con datos que no son sensibles por naturaleza. Si no lo es, hay que agregar un paso de autenticación o una firma.
- **Dónde:** `consentimientos.md`, sección 2.

### 4. ¿El consentimiento del alumno es *libre* si el profesor lo evalúa? ¿Basta la alternativa?
- **Por qué importa:** el consentimiento debe ser «libre» (art. 2, fr. IV; Reglamento art. 12). Un alumno que depende de la calificación puede no sentirse libre de negarse.
- **Postura provisional:** el trabajo cuenta como entregado aunque falle la defensa; el profesor está obligado por contrato a ofrecer una alternativa sin penalización; escribir en vez de hablar siempre se puede.
- **Pido que digas:** si eso basta; si el convenio debe prever consecuencias para el profesor que no la ofrezca; y si la alternativa debe ser también un derecho exigible por el alumno frente a la universidad.
- **Dónde:** `marco.md`, sección 11; `consentimientos.md`, sección 4; `convenio-piloto.md`, cláusula 7.

### 5. Decisiones automatizadas: ¿basta que el profesor «decida» y el contrato diga «no única base»?
- **Por qué importa:** el art. 26, fr. II da un derecho de oposición a un tratamiento automatizado que evalúe «sin intervención humana».
- **Postura provisional:** el profesor decide; la IA no califica; los términos y el convenio prohíben usar el reporte como única base.
- **Pido que digas:** si debe haber además una confirmación en la pantalla de revisión (un paso activo antes de ver el reporte, por ejemplo), y cómo se prueba la intervención humana.
- **Dónde:** `marco.md`, sección 9; `terminos-profesor.md`, cláusula 3.

### 6. ¿Cómo aceptan los alumnos los términos de uso?
- **Por qué importa:** hoy hay tres interruptores y ninguno es para los términos. La licencia del trabajo y el aviso de que se conversa con una IA viven en ellos.
- **Postura provisional:** agregar una línea con un enlace en la pantalla de permisos («al seguir aceptas los términos») o incorporarlos al aviso. Cualquiera de las dos requiere tocar la pantalla. Hoy no está aplicado.
- **Dónde:** `terminos-alumno.md`; `consentimientos.md`, sección 8.

### 7. ¿La evaluación del piloto es una finalidad necesaria o secundaria?
- **Por qué importa:** si fuera secundaria, el profesor y el alumno podrían negarse sin dejar de usar el servicio (Reglamento arts. 14, 41 y 42), y habría que ofrecer un mecanismo para negarse. Hoy no existe.
- **Postura provisional:** para el alumno, solo hay estadísticas disociadas (art. 9, fr. III). Para el profesor, el juicio previo y si coincidió son la razón del piloto: finalidad necesaria.
- **Dónde:** `aviso-privacidad-alumno.md`, sección 3.3; `aviso-privacidad-profesor.md`, sección 3.1.

### 8. ¿Cómo acepta el profesor su aviso y sus términos?
- **Por qué importa:** entra con un enlace firmado y no hay pantalla. Se necesita la constancia.
- **Postura provisional:** mandarle ambos por correo y guardar su respuesta, antes de darle el enlace.
- **Dónde:** `aviso-privacidad-profesor.md` (nota 1); `terminos-profesor.md`.

### 9. ¿Una licencia gratuita del trabajo del alumno, aceptada por medios electrónicos, es válida?
- **Por qué importa:** la Ley Federal del Derecho de Autor dice que toda transmisión de derechos patrimoniales «será onerosa y temporal» y que las licencias deben constar por escrito «de lo contrario serán nulos de pleno derecho» (art. 30; ✔ leído).
- **Postura provisional:** la contraprestación es el servicio; la aceptación electrónica cumple la forma escrita [VERIFICAR: Código de Comercio].
- **Dónde:** `terminos-alumno.md`, cláusula 7.

### 10. ¿Aplica la Ley Federal de Protección al Consumidor a un piloto gratuito?
- **Por qué importa:** si aplica, las cláusulas de limitación de responsabilidad, la jurisdicción y los contratos de adhesión se tienen que ajustar. No consulté esa ley.
- **Postura provisional:** redactar cláusulas razonables, que no limiten lo que la ley no permite limitar.
- **Dónde:** `terminos-alumno.md`, cláusula 13.

### 11. ¿Cuánto tiempo y cómo se conserva la constancia del consentimiento?
- **Por qué importa:** la carga de la prueba es del responsable (Reglamento art. 20). Los datos se borran a los 90 días de cerrar la cohorte. Una reclamación puede llegar después. Por otro lado, el art. 24 permite conservar datos bloqueados por el plazo de prescripción de las acciones que nazcan de la relación jurídica.
- **Postura provisional:** conservar, bloqueada, una constancia mínima (versión, fecha, un identificador no directo) durante el plazo de prescripción que tú indiques, y decirlo en el aviso.
- **Pido que digas:** qué plazo y qué se puede conservar.
- **Dónde:** `aviso-privacidad-alumno.md`, sección 5; `convenio-piloto.md`, cláusula 8.3.

### 12. ¿Celestea es responsable o encargada? ¿Puede el convenio pactarlo?
- **Por qué importa:** define quién da el aviso, quién responde ante la Secretaría y cómo se redacta el convenio. La ley nueva define al responsable de forma circular (art. 2, frs. XIV y XVI) y no usa el criterio de la ley anterior («decide»).
- **Postura provisional:** responsable propio durante el piloto; la universidad, destinatario y responsable de su relación académica; variante de encargada (Anexo B) si la universidad lo exige.
- **Pido que digas:** si lo ves igual, y si la Secretaría decide el rol por los hechos o respeta el pacto.
- **Dónde:** `marco.md`, sección 6; `convenio-piloto.md`, cláusula 5 y Anexo B.

### 13. ¿Y si la universidad es pública?
- **Por qué importa:** a la universidad le aplica la ley de sujetos obligados (expedida en el mismo decreto). Celestea sería proveedor. Este paquete no lo cubre.
- **Postura provisional:** no hacer pilotos con universidades públicas hasta tener este análisis.
- **Dónde:** `marco.md`, sección 6.

### 14. La transferencia al profesor y a la universidad, y la autoridad de un profesor que llega por su cuenta
- **Por qué importa:** el art. 35 exige que el aviso incluya la cláusula de aceptación de la transferencia. Si el profesor usa Celestea sin que su institución lo sepa, puede que no tenga facultad para imponer la actividad a sus alumnos.
- **Postura provisional:** la cláusula está en el interruptor 1 y en el aviso. Para el profesor individual, pedir el visto bueno del coordinador por escrito o que el uso sea voluntario para el alumno.
- **Dónde:** `aviso-privacidad-alumno.md`, sección 4.1; `terminos-profesor.md`, cláusula 5.

### 15. Proveedores en el extranjero: ¿hace falta el segundo interruptor, y qué instrumento sirve como contrato de encargo?
- **Por qué importa:** los proveedores son encargados (art. 2, fr. XII) y no reciben una «transferencia». La ley nueva no pide un contrato de encargo ni cláusulas tipo; el Reglamento sí (arts. 51 y 74-75). Los DPA de los proveedores se aceptan en línea con los términos de servicio.
- **Postura provisional:** mantener el interruptor por transparencia; guardar una copia de cada DPA aceptado como instrumento.
- **Pido que digas:** si los DPA en línea bastan y si en el aviso hay que mencionar a cada proveedor por nombre.
- **Dónde:** `marco.md`, sección 10.

### 16. Datos sensibles que aparecen sin pedirlos; perfil de accesibilidad
- **Por qué importa:** el trabajo y las respuestas pueden mencionar salud, religión o política. El perfil de accesibilidad (`defensa_perfiles`) existe en la base, sin pantalla.
- **Postura provisional:** consentimiento expreso en el interruptor 1; advertir en el aviso; la accesibilidad, sensible, con consentimiento aparte antes de construir su pantalla.
- **Dónde:** `marco.md`, sección 8.

### 17. Vulneraciones: ¿a quién y en cuánto tiempo?
- **Por qué importa:** la ley dice «de forma inmediata» a los titulares cuando el efecto es significativo (art. 19). No encontré obligación de avisar a la Secretaría.
- **Postura provisional:** plan de una página; aviso a la universidad en 72 horas por contrato; contenido del Reglamento art. 65.
- **Pido que digas:** si 72 horas es razonable y si conviene avisar a la Secretaría de todos modos.
- **Dónde:** `marco.md`, sección 13; `convenio-piloto.md`, cláusula 6.6.

### 18. La declaración «soy mayor de edad»
- **Por qué importa:** no se comprueba. Si un menor participa, Celestea trataría datos de un menor sin autorización de sus padres.
- **Postura provisional:** la universidad asegura la edad (cláusula 7.3); la declaración de Celestea es adicional.
- **Dónde:** `marco.md`, sección 12.

### 19. ¿Qué domicilio y qué nombre se publican en el aviso?
- **Por qué importa:** son elementos obligatorios (art. 15, fr. I). Si el responsable es una persona física, publicar su domicilio personal tiene un costo de privacidad.
- **Postura provisional:** usar un domicilio fiscal o de correspondencia que no sea la casa del fundador, cuando la figura lo permita. Depende de la pregunta 23.
- **Dónde:** `aviso-privacidad-alumno.md`, sección 1.

### 20. Alumnos fuera de México
- **Por qué importa:** si un alumno entra desde otro país pueden aplicar leyes extranjeras. El piloto es con universidades mexicanas. No lo analicé.
- **Postura provisional:** limitar el piloto a alumnos de universidades mexicanas.

### 21. ¿Quién cierra una cohorte y cuándo empiezan los 90 días?
- **Por qué importa:** el borrado se cuenta desde ahí. El ADR 0014 lo deja abierto; el sistema tiene una columna y ninguna pantalla.
- **Postura provisional:** la fecha de cierre la fija el Anexo A del convenio para cada grupo.
- **Dónde:** `convenio-piloto.md`, cláusula 8.

### 22. ¿Cuánto vale una multa?
- **Por qué importa:** los rangos son en UMA (arts. 59 y 60). No verifiqué el valor vigente.
- **Pido que confirmes** el valor de la UMA y que me ayudes a decir al fundador qué exposición tiene.
- **Dónde:** `marco.md`, sección 14.

---

# B · Antes de cobrar (prioridad 1)

### 23. ¿SAS, persona física o SAPI?
- **Postura provisional:** SAS si el contrato laboral lo permite y no hay otra sociedad mercantil con control; PFAE como puente; SAPI con inversión.
- **Pido que verifiques:** el límite de ingresos de la SAS ($7,678,849.94; LGSM art. 260 ✔), la compatibilidad con un empleo, y el régimen fiscal. **Esta pregunta es del contador.**
- **Dónde:** `checklist-startup.md`, sección A.

### 24. IVA y retenciones al facturar a una universidad
- **Postura provisional:** 16% de IVA, porque el software no es «enseñanza» exenta (LIVA art. 15, fr. IV ✔). Las retenciones no las revisé. **Del contador.**
- **Dónde:** `checklist-startup.md`, secciones A.3 y B.

### 25. Marca: titular, clases y el personaje
- **Pido que verifiques:** la búsqueda fonética antes de presentar; las clases 9, 41 y 42; si el avatar «Celeste» puede ser marca o solo obra (art. 173, fr. XIV, últimos párrafos); y quién es titular del logotipo.
- **Dónde:** `checklist-startup.md`, sección D.

### 26. Propiedad del código
- **Pido que verifiques:** la cesión a la sociedad, el efecto del art. 103 de la LFDA, qué hacer con código generado por IA y cuál es la forma de cesión para colaboradores (arts. 30, 33, 83 y 83 bis ✔).
- **Dónde:** `checklist-startup.md`, sección E.

### 27. El contrato laboral del fundador
- **Pido que leas** el contrato con la lista de la sección F y digas si hay riesgo de reclamo sobre Celestea (LFDA art. 103 y LFT art. 163 ✔).
- **Dónde:** `checklist-startup.md`, sección F.

### 28. Contrato del piloto pagado
- **Pido que revises:** cláusulas de responsabilidad, nivel de servicio, terminación y reembolso, y las referencias a facturación.
- **Dónde:** `convenio-piloto.md`, Parte II.

---

# C · Después (prioridad 2)

### 29. Menores de edad
- **Por qué importa:** cambia la base del consentimiento, el responsable y el aviso. No se analizó. Ver `checklist-startup.md`, sección G.

### 30. Publicidad y promesas de resultados
- **Pido que verifiques** la ley aplicable y la tabla de afirmaciones. Ver `checklist-startup.md`, sección I.

---

# D · Lo que debe decidir Hi (no el abogado)

- [ ] **Nombre del responsable y domicilio** (B3). Depende de la figura (pregunta 23).
- [ ] **Correo de privacidad** y quién lo atiende (art. 29).
- [ ] **ElevenLabs (B1):** apagar el uso para entrenamiento y pedir confirmación escrita, pasar a Enterprise, o usar otro transcriptor.
- [ ] **Qué modelo de lenguaje** y qué región de procesamiento (`inference_geo` en Anthropic).
- [ ] **Región de Supabase** y plan; plan de Vercel.
- [ ] **Borrado a los 90 días** (B2): quién lo construye y cuándo.
- [ ] **Plan de vulneraciones** (B5) y **retomar sesión sin identidad** (B7).
- [ ] **Aprobar o ajustar el ADR 0014** (sigue en borrador).
- [ ] Si se **toca la lógica** para tener consentimientos separables (`consentimientos.md`, sección 3) y un interruptor para los términos.
- [ ] **Quitar la afirmación** «Ensayo privado, nadie lo ve» o confirmar que es cierta (nota en `aviso-privacidad-simplificado.md`).
- [ ] **Alternativa para quien no acepta:** quién la ofrece en la práctica con el primer profesor.
- [ ] **Fecha de la primera demo con un profesor**, que ya puede hacerse con datos ficticios.
