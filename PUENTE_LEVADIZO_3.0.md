# 🏰 Puente Levadizo 3.0 - Arquitectura Invite-Only

## 📋 Resumen

Celesta ha migrado de un modelo de registro público a un sistema **"Invite-Only"** (solo por invitación). Esta arquitectura garantiza que cada docente reciba una experiencia "llave en mano" con su cuenta pre-aprovisionada antes de acceder a la plataforma.

## 🎯 Objetivos Cumplidos

✅ **Eliminación del Riesgo:** Ruta pública `/signup` completamente removida  
✅ **Flujo "Mago de Oz":** Script de administrador seguro para invitaciones  
✅ **Sistema Nativo:** 100% basado en `supabase.auth.admin.inviteUserByEmail()`  
✅ **Experiencia Simplificada:** Docente solo establece contraseña, sin formularios complejos

---

## 🔐 Arquitectura del Sistema

### 1. Script de Invitación (Administrador)

**Ubicación:** `scripts/invite-teacher.ts`

**Uso:**
```bash
pnpm run invite:teacher profesor@universidad.edu
```

**Requisitos:**
- Acceso a `.env.local` con `SUPABASE_SERVICE_ROLE_KEY`
- Ejecutar solo en entornos seguros (local/servidor confiable)
- Cuenta del docente ya preparada con talleres asignados

**Funcionalidad:**
1. Valida el email
2. Llama a `supabase.auth.admin.inviteUserByEmail()`
3. Especifica `redirectTo: /auth/confirmar-registro`
4. Supabase envía email con magic link de un solo uso

---

### 2. Página de Confirmación de Registro

**Ruta:** `/auth/confirmar-registro`  
**Tipo:** Client Component (`'use client'`)

**Flujo:**
1. Docente recibe email de invitación
2. Click en magic link → redirige a `/auth/confirmar-registro`
3. Token de invitación en el hash de la URL (`#`)
4. Cliente de Supabase detecta token automáticamente
5. Evento `PASSWORD_RECOVERY` o `SIGNED_IN` dispara validación
6. Formulario solicita solo contraseña (sin email)
7. `supabase.auth.updateUser({ password })` establece contraseña
8. Redirige a `/grupos` (centro de control del docente)

**Estados Manejados:**
- ⏳ Verificando token
- ❌ Token inválido/expirado
- ✅ Registro exitoso
- 📝 Formulario de contraseña

---

## 🚫 Constraintes Arquitecturales

### Lo que NO hacemos:

❌ **NO** usamos tabla personalizada `invitaciones_piloto`  
❌ **NO** validamos el token en el servidor  
❌ **NO** creamos rutas públicas de registro  
❌ **NO** usamos tokens estáticos o genéricos  
❌ **NO** requerimos campos de email en confirmación

### Por qué:

- **Token en Hash:** Supabase pasa el token en `#` de la URL, solo accesible en cliente
- **Sistema Nativo:** Aprovechamos completamente la infraestructura de Supabase
- **Seguridad:** Service role key solo se usa en script de administrador
- **UX Simplificada:** Docente no necesita recordar o ingresar su email

---

## 📁 Archivos Modificados/Creados

### Nuevos:
- ✅ `scripts/invite-teacher.ts` - Script de invitación del administrador
- ✅ `src/app/auth/confirmar-registro/page.tsx` - Página de confirmación

### Eliminados:
- ❌ `src/app/signup/` - Directorio completo de registro público

### Modificados:
- 📝 `package.json` - Agregadas dependencias `tsx` y `dotenv` + script `invite:teacher`
- 📝 `src/app/pilot-login/page.tsx` - Eliminado enlace "Crear cuenta"
- 📝 `src/lib/auth.ts` - Función `signUpTeacher()` marcada como `@deprecated`

---

## 🔒 Seguridad

### Variables de Entorno Requeridas:

```env
# .env.local (NUNCA subir a Git)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc... # ⚠️ CRÍTICO - Solo en entornos seguros
```

### Mejores Prácticas:

1. ✅ Ejecutar script de invitación solo desde máquinas de administradores
2. ✅ Nunca commitear `.env.local`
3. ✅ Rotar `SERVICE_ROLE_KEY` si se expone
4. ✅ Revisar logs de Supabase para detectar uso indebido
5. ✅ Limitar acceso al script a personal autorizado

---

## 📊 Flujo Completo - Diagrama

```
┌─────────────────────────────────────────────────────┐
│ 1. ADMINISTRADOR (Local/Seguro)                     │
│    $ pnpm run invite:teacher prof@uni.edu           │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 2. SUPABASE AUTH                                    │
│    • Genera magic link de un solo uso              │
│    • Envía email a prof@uni.edu                     │
│    • Token en URL hash (#)                          │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 3. DOCENTE - Email                                  │
│    "Has sido invitado a Celesta"                    │
│    [Activar Cuenta] → Click                         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 4. NAVEGADOR - /auth/confirmar-registro#token=...  │
│    • Cliente detecta token automáticamente          │
│    • Evento: PASSWORD_RECOVERY                      │
│    • Formulario: Solo contraseña                    │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 5. SUPABASE - updateUser({ password })              │
│    • Contraseña establecida                         │
│    • Sesión activa creada                           │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│ 6. DOCENTE - /grupos (Dashboard)                    │
│    ✅ Cuenta activada con talleres pre-asignados    │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### Flujo de Prueba:

1. **Preparar cuenta:**
   ```bash
   # TODO: Script de aprovisionamiento de cuenta
   ```

2. **Invitar docente:**
   ```bash
   pnpm run invite:teacher test@ejemplo.com
   ```

3. **Verificar email:**
   - Revisar bandeja de entrada
   - Confirmar link de invitación
   - Validar que redirija a `/auth/confirmar-registro`

4. **Completar registro:**
   - Establecer contraseña (min 6 caracteres)
   - Verificar redirección a `/grupos`
   - Confirmar talleres pre-asignados visibles

5. **Testing de Errores:**
   - ❌ Token ya usado → Mensaje "Enlace inválido"
   - ❌ Token expirado → Mensaje "Enlace expirado"
   - ❌ Contraseñas no coinciden → Validación frontend
   - ❌ Contraseña < 6 caracteres → Validación frontend

---

## 📝 Notas de Implementación

### Fase 0 (MVP Piloto):
- ✅ Modelo "Servicio de Conserje Pedagógico"
- ✅ Aprovisionamiento manual de cuentas
- ✅ Sistema invite-only nativo de Supabase
- ✅ Sin auto-servicio de registro

### Próximos Pasos:
- [ ] Script de aprovisionamiento de cuenta completo
- [ ] Panel de administración para gestionar invitaciones
- [ ] Métricas de conversión (invitación → activación)
- [ ] Plantillas de email personalizadas
- [ ] Sistema de recordatorios para invitaciones no activadas

---

## 🆘 Troubleshooting

### Problema: Email no llega
**Solución:**
- Verificar configuración de email en Supabase Dashboard
- Revisar spam/promociones
- Confirmar email válido en logs de Supabase

### Problema: Token inválido
**Solución:**
- Token de un solo uso, ya fue utilizado
- Token expirado (verificar TTL en Supabase)
- Re-enviar invitación con script

### Problema: Error al establecer contraseña
**Solución:**
- Verificar políticas de contraseña en Supabase
- Confirmar que sesión está activa durante update
- Revisar logs del navegador (F12 → Console)

---

## 📞 Contacto

Para soporte técnico o preguntas sobre la arquitectura:
- Revisar logs de Supabase Dashboard
- Ejecutar script con flag de debug: `DEBUG=1 pnpm run invite:teacher`
- Documentación Supabase: https://supabase.com/docs/guides/auth/auth-email-invite

---

**Última actualización:** Oct 30, 2025  
**Versión:** 3.0  
**Estado:** ✅ Implementado y Funcionando
