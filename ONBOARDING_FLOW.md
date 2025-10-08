# 🚀 Flujo de Onboarding - Beta Privada de Celestea

**Fecha de creación:** 2025-10-06  
**Modelo:** Beta Privada / Concierge  
**Estado:** Activo

---

## 📋 Resumen Ejecutivo

Este documento describe el proceso **manual y controlado** para incorporar nuevos docentes al piloto de Celestea. Durante la fase de beta privada, no hay autoservicio - cada docente es cuidadosamente seleccionado y dado de alta por el equipo de Celestea.

### Principios Clave

✅ **Control Total** - Nosotros decidimos quién entra  
✅ **Onboarding Personalizado** - Cada docente recibe atención directa  
✅ **URLs Ocultas** - No hay enlaces públicos a login/signup  
✅ **Experiencia VIP** - Acceso exclusivo por invitación  

---

## 🔄 Flujo Completo del Proceso

### 1️⃣ Recepción de Solicitud

**Trigger:** Un visitante hace clic en "Solicitar Acceso a la Beta" en la landing page.

**Lo que sucede:**
- Se abre un modal con formulario solicitando:
  - Nombre Completo
  - Email
  - Nombre de la Escuela/Institución
- Al enviar, se dispara `POST /api/beta-request`
- El endpoint envía un **email automático** a `uziel@celestea.ai` con la información del solicitante

**Email recibido contiene:**
```
🎯 Nueva Solicitud de Beta

👤 Nombre: [Nombre del solicitante]
📧 Email: [email@escuela.com]
🏫 Institución: [Nombre de la escuela]
📅 Fecha: [timestamp]

[Botón: Responder al Solicitante]
```

---

### 2️⃣ Evaluación Interna

**Responsable:** Equipo de Celestea  
**Criterios de evaluación:**
- ¿La institución es un buen fit para el piloto?
- ¿El docente muestra interés genuino en innovación educativa?
- ¿Tenemos capacidad para dar soporte?
- ¿Es una oportunidad de aprendizaje valiosa?

**Decisión:**
- ✅ **APROBADO** → Continuar a paso 3
- ❌ **RECHAZADO** → Enviar email cortés explicando que estamos en capacidad limitada y agregar a waitlist
- ⏸️ **EN ESPERA** → Solicitar más información antes de decidir

---

### 3️⃣ Creación Manual de Cuenta (APROBADO)

**Responsable:** Miembro del equipo con acceso a Supabase  
**Herramienta:** Supabase Dashboard o Script

#### 3.1 Crear Usuario en Supabase Auth

**Opción A - Via Supabase Dashboard:**
1. Ir a `Authentication` → `Users`
2. Clic en "Add user" → "Create new user"
3. Ingresar:
   - Email: `email@escuela.com`
   - Password: Generar contraseña segura (ejemplo: `CelesteaPilot2025!`)
   - Auto Confirm User: ✅ **Activar** (para evitar verificación de email)
4. Copiar el UUID del usuario creado

**Opción B - Via SQL:**
```sql
-- Ejecutar en Supabase SQL Editor
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'email@escuela.com', -- Email del docente
  crypt('ContraseñaTemporal123!', gen_salt('bf')),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Nombre del Docente"}',
  NOW(),
  NOW()
);
```

#### 3.2 Crear Perfil en Tabla `teachers`

```sql
-- Obtener el user_id del paso anterior
WITH new_user AS (
  SELECT id FROM auth.users WHERE email = 'email@escuela.com'
)
INSERT INTO teachers (user_id, full_name, email)
SELECT id, 'Nombre Completo del Docente', 'email@escuela.com'
FROM new_user;
```

**Verificación:**
```sql
-- Confirmar que el docente existe
SELECT t.*, u.email, u.email_confirmed_at
FROM teachers t
JOIN auth.users u ON u.id = t.user_id
WHERE t.email = 'email@escuela.com';
```

---

### 4️⃣ Envío de Email de Bienvenida

**Responsable:** Miembro del equipo  
**Template del Email:**

```markdown
Asunto: 🎉 Bienvenido al Piloto de Celestea - Acceso Exclusivo

Hola [Nombre del Docente],

¡Excelente noticia! Has sido seleccionado para formar parte del **piloto exclusivo de Celestea**, el primer sistema operativo pedagógico impulsado por IA.

## 🔐 Tus Credenciales de Acceso

**URL de Inicio de Sesión:** https://celesta.ai/pilot-login
**Email:** email@escuela.com
**Contraseña Temporal:** [ContraseñaTemporal123!]

⚠️ **Importante:** Por favor, cambia tu contraseña después del primer inicio de sesión.

## 📚 Próximos Pasos

1. **Inicia Sesión:** Usa el enlace de arriba con tus credenciales
2. **Crea tu Primer Grupo:** En el dashboard, crea un grupo para tus estudiantes
3. **Comparte el Enlace:** Envía el enlace de invitación a tus estudiantes
4. **Explora Talleres:** Accede a la biblioteca de talleres interactivos

## 🤝 Soporte Dedicado

Durante el piloto, tendrás acceso directo a nuestro equipo:
- 📧 Email: uziel@celestea.ai
- 💬 WhatsApp: [Número de soporte]
- 📞 Llamada de Onboarding: [Link a Calendly]

Estamos aquí para asegurar que tu experiencia sea excepcional.

## 🎯 Lo Que Esperamos de Ti

- **Feedback honesto:** Tu opinión es oro para nosotros
- **Uso activo:** Al menos 1 taller por semana
- **Compartir insights:** ¿Qué funciona? ¿Qué no?

¡Bienvenido a la revolución educativa!

Con entusiasmo,
El Equipo de Celestea

---
🔒 Este enlace es exclusivo y personal. Por favor, no lo compartas públicamente.
```

**Checklist antes de enviar:**
- [ ] Credenciales correctas copiadas
- [ ] URL `/pilot-login` verificada
- [ ] Contraseña temporal segura generada
- [ ] Información de soporte actualizada
- [ ] Link de calendario para onboarding adjuntado

---

### 5️⃣ Onboarding Call (Opcional pero Recomendado)

**Duración:** 30 minutos  
**Objetivo:** Asegurar éxito temprano y construir relación

**Agenda sugerida:**
1. **Bienvenida (5 min)**
   - Agradecer por unirse al piloto
   - Explicar la visión de Celestea

2. **Demo Guiada (15 min)**
   - Mostrar cómo crear un grupo
   - Navegar la biblioteca de talleres
   - Compartir enlace con estudiantes
   - Ver insights de estudiantes

3. **Q&A y Expectativas (10 min)**
   - Responder preguntas
   - Establecer comunicación continua
   - Programar check-in semanal

---

### 6️⃣ Monitoreo Post-Onboarding

**Responsable:** Customer Success / Equipo de Producto

**Métricas a observar (primeros 7 días):**
- [ ] ¿Inició sesión exitosamente?
- [ ] ¿Creó al menos un grupo?
- [ ] ¿Compartió el enlace con estudiantes?
- [ ] ¿Exploró la biblioteca de talleres?
- [ ] ¿Los estudiantes están activos?

**Acciones proactivas:**

**Día 1:** Email de follow-up preguntando si pudo entrar  
**Día 3:** Si no ha creado grupo, ofrecer ayuda  
**Día 7:** Check-in call para ver experiencia inicial  
**Día 14:** Solicitar feedback formal  

---

## 🛡️ Seguridad y Mejores Prácticas

### URLs Protegidas

✅ **URLs Ocultas (No enlazadas públicamente):**
- `/pilot-login` - Inicio de sesión para docentes del piloto
- `/pilot-signup` - Registro para docentes (solo por invitación directa)

❌ **URLs Públicas Removidas:**
- `/login` - ELIMINADO de la landing
- `/signup` - ELIMINADO de la landing

### Gestión de Contraseñas

- **Contraseñas temporales:** Mínimo 12 caracteres, incluir mayúsculas, minúsculas, números y símbolos
- **Política:** Forzar cambio en primer login (implementar en futuro)
- **Almacenamiento:** NUNCA guardar contraseñas en texto plano - solo en Supabase Auth

### Logs y Auditoría

Registrar cada acción de onboarding:
```typescript
// Ejemplo de log estructurado
console.log('[Onboarding] Nuevo docente agregado:', {
  email: 'docente@escuela.com',
  school: 'Nombre de la Escuela',
  addedBy: 'admin@celestea.ai',
  timestamp: new Date().toISOString(),
  pilotAccess: true
});
```

---

## 🚨 Troubleshooting

### Problema: Docente no puede iniciar sesión

**Checklist de diagnóstico:**
1. ¿El email está confirmado en Supabase Auth? (`email_confirmed_at` debe tener valor)
2. ¿Existe el perfil en la tabla `teachers`?
3. ¿La contraseña es correcta? (puede resetear en Supabase Dashboard)
4. ¿Está usando `/pilot-login` y no `/login`?

**Solución rápida:**
```sql
-- Confirmar email manualmente
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email = 'docente@escuela.com';

-- Resetear contraseña
UPDATE auth.users
SET encrypted_password = crypt('NuevaContraseña123!', gen_salt('bf'))
WHERE email = 'docente@escuela.com';
```

### Problema: Email de bienvenida no llegó

**Causas comunes:**
- Email en spam
- Error tipográfico en dirección
- Servicio de email caído

**Solución:**
1. Verificar email en Supabase: `SELECT email FROM auth.users WHERE email LIKE '%@escuela.com'`
2. Reenviar manualmente desde Gmail/Outlook
3. Si persiste, usar WhatsApp como respaldo

---

## 📊 Métricas de Éxito del Onboarding

### KPIs a Medir

| Métrica | Objetivo | Cómo Medir |
|---------|----------|------------|
| **Time to First Login** | < 24h desde email | Timestamp entre email enviado y primer login |
| **Activation Rate** | 100% (todo piloto debe activarse) | % que crea al menos 1 grupo |
| **Student Invites** | 80% envía invitaciones en primera semana | % que comparte enlace con estudiantes |
| **Workshop Completion** | 50% completa 1 taller en 2 semanas | % que tiene estudiantes con talleres completos |
| **Support Tickets** | < 2 por docente en primera semana | Conteo de tickets de soporte |

### Dashboard Sugerido

Crear vista en Supabase o Metabase con:
- Lista de docentes piloto
- Estado de activación (login, grupo creado, estudiantes activos)
- Fecha de último uso
- Número de estudiantes invitados
- Talleres activos

---

## 🔄 Proceso de Offboarding (Si es necesario)

Si un docente necesita salir del piloto:

1. **Comunicación:** Entender razón de salida (feedback valioso)
2. **Exportación de datos:** Ofrecer CSV con datos de sus estudiantes
3. **Desactivación suave:**
   ```sql
   -- No eliminar, solo desactivar
   UPDATE teachers
   SET status = 'inactive', offboarded_at = NOW()
   WHERE email = 'docente@escuela.com';
   ```
4. **Follow-up:** Email de agradecimiento y posibilidad de volver

---

## 📝 Templates y Recursos

### Template: Email de Rechazo Cortés

```markdown
Asunto: Gracias por tu interés en Celestea

Hola [Nombre],

Muchas gracias por tu interés en formar parte del piloto de Celestea.

Actualmente estamos trabajando con un número limitado de docentes para asegurar que cada uno reciba la atención y soporte que merece. En este momento, hemos alcanzado nuestra capacidad para esta fase del piloto.

Te hemos agregado a nuestra **lista de espera prioritaria**. Serás uno de los primeros en ser contactado cuando abramos nuevos espacios.

Mientras tanto, te invitamos a:
- Seguir nuestro progreso en [LinkedIn/Twitter]
- Unirte a nuestra whitelist en: https://celesta.ai/questionnaire

Gracias por tu paciencia y por creer en la transformación educativa.

Saludos,
El Equipo de Celestea
```

### Script: Creación Rápida de Docente

```bash
# create-pilot-teacher.sh
# Uso: ./create-pilot-teacher.sh nombre@escuela.com "Nombre Completo" "Nombre Escuela"

EMAIL=$1
FULL_NAME=$2
SCHOOL=$3
PASSWORD=$(openssl rand -base64 12)

echo "Creating pilot teacher account..."
echo "Email: $EMAIL"
echo "Password: $PASSWORD"

# Nota: Este script requiere Supabase CLI configurado
supabase db execute --sql "
  -- Crear usuario en Auth
  -- (SQL de creación aquí)
  
  -- Crear perfil en teachers
  -- (SQL de perfil aquí)
"

echo "✅ Account created!"
echo "📧 Send welcome email with these credentials"
```

---

## 🎯 Próximos Pasos (Roadmap)

### Corto Plazo (1-2 semanas)
- [ ] Automatizar generación de contraseñas seguras
- [ ] Crear dashboard de monitoreo de onboarding
- [ ] Template de emails en sistema (no manual)

### Mediano Plazo (1 mes)
- [ ] Auto-onboarding con código de invitación
- [ ] Portal de admin para gestión de pilotos
- [ ] Métricas en tiempo real de adopción

### Largo Plazo (3 meses)
- [ ] Transición a self-service con aprobación
- [ ] Sistema de referidos (docentes invitan a otros)
- [ ] Programa de embajadores del piloto

---

## 📞 Contactos del Equipo

**Onboarding Lead:** [Nombre]  
**Email:** uziel@celestea.ai  
**Soporte Técnico:** [Nombre]  
**Customer Success:** [Nombre]  

---

**Última actualización:** 2025-10-06  
**Versión:** 1.0  
**Mantenido por:** Equipo de Celestea

---

## ✅ Checklist Rápida para Cada Onboarding

- [ ] Recibí solicitud por email
- [ ] Evalué y decidí aprobar
- [ ] Creé usuario en Supabase Auth
- [ ] Creé perfil en tabla `teachers`
- [ ] Verifiqué que email esté confirmado
- [ ] Generé contraseña segura temporal
- [ ] Envié email de bienvenida con credenciales
- [ ] Agendé (o realicé) onboarding call
- [ ] Agregué a canal de soporte prioritario
- [ ] Programé follow-up en 3 días
- [ ] Documenté en CRM/spreadsheet de pilotos

**¡Listo para el siguiente docente!** 🚀
