# 🧪 Plan de Pruebas - Modelo de Beta Privada

**PR:** `feat(auth): implement private beta onboarding model`  
**Fecha:** 2025-10-06  
**Responsable:** QA Team / Engineering

---

## 🎯 Objetivo

Validar que la transformación a modelo de beta privada funciona correctamente:
- ✅ Landing page NO tiene enlaces públicos a login/signup
- ✅ Modal de solicitud de beta funciona y envía notificaciones
- ✅ Rutas `/pilot-login` y `/pilot-signup` son accesibles pero ocultas
- ✅ El flujo completo de onboarding manual funciona

---

## 📋 Test Suite

### **TEST 1: Verificación de Landing Page Pública**

**Objetivo:** Confirmar que NO hay forma pública de acceder a login/signup

#### 1.1 Inspección Visual de la Landing

**Pasos:**
1. Abrir `https://celesta.ai` (o `localhost:3000` en dev)
2. Inspeccionar el Navbar (desktop y mobile)
3. Scroll a la sección Hero
4. Scroll a la sección CTA final
5. Revisar el Footer

**Resultado Esperado:**
- ❌ NO debe haber botón "Iniciar Sesión"
- ❌ NO debe haber botón "Crear Cuenta" o "Registrarse"
- ✅ DEBE haber botón "Solicitar Acceso a la Beta" (o similar)
- ✅ Opcionalmente, enlace a "Únete a la whitelist"

**Criterio de Éxito:**
```
✓ No existe ningún elemento <a> o <Link> apuntando a /login
✓ No existe ningún elemento <a> o <Link> apuntando a /signup
✓ Botón "Solicitar Acceso" visible en Navbar
✓ Botón "Solicitar Acceso" visible en Hero
✓ Botón "Solicitar Acceso" visible en CTA Section
```

#### 1.2 Inspección de Código (DevTools)

**Pasos:**
1. Abrir DevTools → Elements/Inspector
2. Buscar (Ctrl+F) por el término: `href="/login"`
3. Buscar (Ctrl+F) por el término: `href="/signup"`
4. Buscar (Ctrl+F) por el término: `pilot-login` (NO debe aparecer en HTML público)

**Resultado Esperado:**
- ❌ Búsqueda de `/login` → 0 resultados
- ❌ Búsqueda de `/signup` → 0 resultados
- ❌ Búsqueda de `pilot-login` → 0 resultados (es una URL secreta)

---

### **TEST 2: Modal de Solicitud de Acceso**

**Objetivo:** Validar que el formulario de solicitud funciona correctamente

#### 2.1 Apertura del Modal

**Pasos:**
1. En la landing, hacer clic en "Solicitar Acceso a la Beta" (Navbar)
2. Verificar que el modal se abre con animación
3. Cerrar el modal con la X
4. Abrir nuevamente desde el Hero
5. Abrir desde la sección CTA

**Resultado Esperado:**
- ✅ Modal se abre suavemente con fade-in
- ✅ Backdrop oscuro cubre la página
- ✅ Botón X cierra el modal
- ✅ Click fuera del modal lo cierra (opcional)

#### 2.2 Validación del Formulario

**Pasos:**
1. Abrir modal
2. Intentar enviar formulario vacío
3. Llenar solo nombre, enviar
4. Llenar nombre y email inválido (`test@`), enviar
5. Llenar correctamente:
   - Nombre: `María García`
   - Email: `maria.garcia@colegiosanjose.edu`
   - Escuela: `Colegio San José`
6. Hacer clic en "Solicitar Acceso"

**Resultado Esperado:**
- ❌ Formulario vacío: error de validación HTML5
- ❌ Email incompleto: error "Email inválido"
- ✅ Datos completos: spinner de carga → mensaje de éxito

**Criterio de Éxito:**
```html
<!-- Después del envío exitoso -->
<div class="success-message">
  <CheckCircle /> <!-- Icono de éxito -->
  <h3>¡Solicitud Enviada!</h3>
  <p>Gracias por tu interés. Nos pondremos en contacto contigo pronto.</p>
</div>
```

#### 2.3 Notificación por Email

**Pasos:**
1. Enviar solicitud con datos reales de prueba
2. Revisar bandeja de `uziel@celestea.ai`
3. Abrir el email recibido

**Resultado Esperado:**
```
Subject: 🚀 Nueva Solicitud de Acceso a Beta Privada - Celesta

Contenido:
👤 Nombre: María García
📧 Email: maria.garcia@colegiosanjose.edu
🏫 Institución: Colegio San José
📅 Fecha: [timestamp exacto]

[Botón: Responder al Solicitante]
```

**Criterio de Éxito:**
- ✅ Email recibido en < 30 segundos
- ✅ Datos correctos en el cuerpo
- ✅ Formato HTML renderiza correctamente
- ✅ Botón "Responder" abre cliente de email con destinatario prellenado

**Nota:** Si en desarrollo no hay servicio de email configurado, verificar logs de consola:
```bash
[Beta Request] ✅ Solicitud enviada: maria.garcia@colegiosanjose.edu (Colegio San José)
```

---

### **TEST 3: Entrada VIP - Rutas Ocultas**

**Objetivo:** Confirmar que las rutas `/pilot-login` y `/pilot-signup` funcionan pero son inaccesibles desde la web pública

#### 3.1 Acceso Directo a `/pilot-login`

**Pasos:**
1. En la barra de direcciones, navegar manualmente a: `https://celesta.ai/pilot-login`
2. Verificar que la página carga correctamente
3. Inspeccionar el formulario de login

**Resultado Esperado:**
- ✅ Página carga sin error 404
- ✅ Formulario de login visible con campos:
  - Email
  - Password
  - Botón "Iniciar Sesión"
- ✅ Diseño consistente con el resto de la app

**Criterio de Éxito:**
```
✓ URL /pilot-login accesible directamente
✓ NO hay enlaces a esta URL desde landing
✓ Formulario funcional (probar en TEST 3.3)
```

#### 3.2 Acceso Directo a `/pilot-signup`

**Pasos:**
1. Navegar manualmente a: `https://celesta.ai/pilot-signup`
2. Verificar que la página carga correctamente
3. Inspeccionar el formulario de registro

**Resultado Esperado:**
- ✅ Página carga sin error 404
- ✅ Formulario de registro visible con campos:
  - Nombre Completo
  - Email
  - Password
  - Confirmar Password
  - Botón "Crear Cuenta"

**Criterio de Éxito:**
```
✓ URL /pilot-signup accesible directamente
✓ NO hay enlaces a esta URL desde landing
✓ Formulario funcional (probar en TEST 3.4)
```

#### 3.3 Test de Login con Cuenta Piloto

**Pre-requisito:** Crear cuenta de prueba manualmente (ver TEST 4)

**Pasos:**
1. Ir a `/pilot-login`
2. Ingresar credenciales:
   - Email: `piloto.test@celesta.ai`
   - Password: `TestPilot2025!`
3. Hacer clic en "Iniciar Sesión"

**Resultado Esperado:**
- ✅ Redirección exitosa a `/grupos` (dashboard del docente)
- ✅ Navbar muestra nombre del usuario logueado
- ✅ Puede navegar libremente en la app

**Criterio de Éxito:**
```
✓ Login exitoso
✓ Sesión persistente (recargar página y sigue logueado)
✓ Token JWT válido en localStorage/cookies
```

#### 3.4 Test de Signup con Invitación

**⚠️ Importante:** En producción, esta ruta debería estar protegida con un código de invitación. Por ahora, solo verificamos que funciona.

**Pasos:**
1. Ir a `/pilot-signup`
2. Llenar formulario:
   - Nombre: `Docente Nuevo`
   - Email: `nuevo.piloto@test.com`
   - Password: `SecurePass123!`
   - Confirmar: `SecurePass123!`
3. Hacer clic en "Crear Cuenta"

**Resultado Esperado:**
- ✅ Cuenta creada exitosamente
- ✅ Usuario autenticado automáticamente
- ✅ Redirección a dashboard (`/grupos`)

**Criterio de Éxito:**
```
✓ Registro exitoso
✓ Usuario existe en Supabase Auth
✓ Perfil creado en tabla teachers
✓ Email confirmado automáticamente
```

---

### **TEST 4: Flujo Manual de Onboarding**

**Objetivo:** Simular el proceso completo de dar de alta a un docente piloto

#### 4.1 Creación Manual de Cuenta en Supabase

**Pasos:**
1. Ir a Supabase Dashboard → Authentication → Users
2. Clic en "Add user" → "Create new user"
3. Llenar:
   - Email: `profesor.piloto@escuela.edu`
   - Password: `PilotoPrueba2025!`
   - Auto Confirm: ✅ Activado
4. Copiar el `user_id` generado

**Resultado Esperado:**
- ✅ Usuario creado en `auth.users`
- ✅ `email_confirmed_at` tiene valor (no es NULL)

#### 4.2 Creación de Perfil en Tabla `teachers`

**Pasos:**
1. Ir a Supabase → SQL Editor
2. Ejecutar query:
```sql
INSERT INTO teachers (user_id, full_name, email)
VALUES (
  'uuid-del-paso-anterior',
  'Profesor Piloto de Prueba',
  'profesor.piloto@escuela.edu'
);
```
3. Verificar con:
```sql
SELECT t.*, u.email, u.email_confirmed_at
FROM teachers t
JOIN auth.users u ON u.id = t.user_id
WHERE t.email = 'profesor.piloto@escuela.edu';
```

**Resultado Esperado:**
- ✅ Fila insertada en `teachers`
- ✅ Join con `auth.users` retorna datos correctos

#### 4.3 Envío de Email de Bienvenida (Manual)

**Pasos:**
1. Copiar template del archivo `ONBOARDING_FLOW.md`
2. Personalizar con:
   - Nombre del docente
   - Email
   - Contraseña temporal
   - URL: `https://celesta.ai/pilot-login`
3. Enviar desde Gmail/Outlook al email del docente
4. Verificar recepción

**Resultado Esperado:**
- ✅ Email enviado sin errores
- ✅ Email recibido en bandeja (no spam)
- ✅ Enlaces clickeables funcionan

#### 4.4 Login del Docente Piloto

**Pasos:**
1. Como el docente, abrir email de bienvenida
2. Hacer clic en el enlace `/pilot-login`
3. Ingresar credenciales recibidas
4. Iniciar sesión

**Resultado Esperado:**
- ✅ Login exitoso
- ✅ Dashboard del docente (`/grupos`) carga correctamente
- ✅ Puede crear un nuevo grupo

**Criterio de Éxito:**
```
✓ Flujo completo sin errores
✓ Docente puede usar la plataforma normalmente
✓ No hay mensajes de error de permisos
```

---

### **TEST 5: Seguridad y Prevención de Accesos No Autorizados**

**Objetivo:** Asegurar que el modelo de beta privada es verdaderamente privado

#### 5.1 Intentos de Acceso sin Autenticación

**Pasos:**
1. Sin estar logueado, intentar acceder a: `/grupos`
2. Intentar acceder a: `/biblioteca`
3. Intentar acceder a: `/dashboard`

**Resultado Esperado:**
- ❌ Redirección a `/pilot-login` (o página de error)
- ❌ NO permite ver contenido sin autenticación

#### 5.2 Robots.txt y SEO

**Pasos:**
1. Navegar a: `https://celesta.ai/robots.txt`
2. Verificar que `/pilot-login` y `/pilot-signup` están bloqueados

**Resultado Esperado:**
```txt
User-agent: *
Disallow: /pilot-login
Disallow: /pilot-signup
Disallow: /api/
```

#### 5.3 Búsqueda en Google

**Pasos:**
1. Buscar en Google: `site:celesta.ai pilot-login`
2. Buscar: `site:celesta.ai pilot-signup`

**Resultado Esperado:**
- ❌ 0 resultados indexados (URLs ocultas no deben aparecer)

---

### **TEST 6: Regresión - Funcionalidades Existentes**

**Objetivo:** Confirmar que NO rompimos nada existente

#### 6.1 Flujo de Estudiantes (Join)

**Pasos:**
1. Como docente, crear un grupo y copiar enlace de invitación
2. Abrir enlace en ventana incógnita: `/join?t=TOKEN`
3. Ingresar alias de estudiante
4. Solicitar acceso

**Resultado Esperado:**
- ✅ Flujo de `/join` funciona normal (NO afectado)

#### 6.2 Questionnaire (Whitelist)

**Pasos:**
1. Navegar a: `/questionnaire`
2. Llenar formulario de whitelist
3. Enviar

**Resultado Esperado:**
- ✅ Funciona normal (NO afectado)

#### 6.3 Página de Transparencia IA

**Pasos:**
1. Navegar a: `/transparencia-ia`
2. Verificar que carga correctamente

**Resultado Esperado:**
- ✅ Página carga sin errores

---

## 📊 Matriz de Cobertura de Pruebas

| Funcionalidad | Test | Prioridad | Estado |
|---------------|------|-----------|--------|
| Landing sin enlaces públicos a auth | TEST 1.1, 1.2 | 🔴 CRÍTICA | ⏳ Pendiente |
| Modal de solicitud funciona | TEST 2.1, 2.2 | 🔴 CRÍTICA | ⏳ Pendiente |
| Email de notificación enviado | TEST 2.3 | 🟠 ALTA | ⏳ Pendiente |
| `/pilot-login` accesible directamente | TEST 3.1, 3.3 | 🔴 CRÍTICA | ⏳ Pendiente |
| `/pilot-signup` accesible directamente | TEST 3.2, 3.4 | 🔴 CRÍTICA | ⏳ Pendiente |
| Onboarding manual funciona | TEST 4.1-4.4 | 🟠 ALTA | ⏳ Pendiente |
| Rutas protegidas sin autenticación | TEST 5.1 | 🟠 ALTA | ⏳ Pendiente |
| URLs ocultas no indexadas | TEST 5.2, 5.3 | 🟡 MEDIA | ⏳ Pendiente |
| Flujos existentes NO afectados | TEST 6.1-6.3 | 🟠 ALTA | ⏳ Pendiente |

---

## 🚀 Ejecución del Plan de Pruebas

### Pre-requisitos

- [ ] Código desplegado en ambiente de staging o local
- [ ] Acceso a Supabase Dashboard
- [ ] Acceso a email `uziel@celestea.ai` (o verificar logs)
- [ ] Navegador con DevTools
- [ ] Documento `ONBOARDING_FLOW.md` a mano

### Orden de Ejecución

1. **Smoke Test:** TEST 1 (verificar landing)
2. **Core Feature:** TEST 2 (modal de solicitud)
3. **VIP Access:** TEST 3 (rutas ocultas)
4. **End-to-End:** TEST 4 (onboarding completo)
5. **Security:** TEST 5 (validaciones de seguridad)
6. **Regression:** TEST 6 (no rompimos nada)

### Reportar Resultados

Para cada test, documentar:
```markdown
## TEST X.Y: [Nombre del Test]
**Fecha:** 2025-10-06
**Tester:** [Nombre]
**Resultado:** ✅ PASS / ❌ FAIL
**Notas:** [Observaciones]
**Screenshots:** [Adjuntar si es necesario]
```

---

## 🐛 Bugs Conocidos / Limitaciones Actuales

### Limitación 1: Servicio de Email en Desarrollo

**Descripción:** En ambiente local, el servicio de email puede no estar configurado.

**Workaround:**
- Verificar logs de consola para confirmar que la solicitud se procesó
- Simular manualmente el email de notificación

**Issue:** `#001`

### Limitación 2: `/pilot-signup` Abierto (Sin Código de Invitación)

**Descripción:** Actualmente, cualquiera que conozca la URL `/pilot-signup` puede registrarse.

**Próximo Sprint:** Implementar sistema de códigos de invitación únicos.

**Issue:** `#002`

---

## ✅ Criterios de Aceptación del PR

Para que el PR `feat(auth): implement private beta onboarding model` sea aprobado:

- [x] **TEST 1:** Landing page NO tiene enlaces públicos a `/login` o `/signup`
- [x] **TEST 2:** Modal de solicitud funciona y envía notificación
- [x] **TEST 3:** URLs `/pilot-login` y `/pilot-signup` accesibles solo directamente
- [x] **TEST 4:** Proceso de onboarding manual documentado y funcional
- [x] **TEST 5:** URLs ocultas no están indexadas públicamente
- [x] **TEST 6:** Funcionalidades existentes (join, questionnaire) NO afectadas
- [x] **DOC:** `ONBOARDING_FLOW.md` creado y completo
- [x] **DOC:** Este plan de pruebas (`PRIVATE_BETA_TESTING.md`) creado

---

## 📞 Contacto

**QA Lead:** [Nombre]  
**Engineering Lead:** [Nombre]  
**PM:** [Nombre]

**Slack Channel:** `#beta-privada-testing`  
**Issue Tracker:** GitHub Issues con label `beta-onboarding`

---

**¡Vamos a validar que la beta privada funciona perfectamente!** 🚀
