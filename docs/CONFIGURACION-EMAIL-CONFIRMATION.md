# Configuración de Confirmación de Email en Supabase

## ⚠️ Problema Actual

Cuando un docente se registra, el sistema lo deja entrar directamente al dashboard **sin confirmar su email**. Esto es inseguro y puede permitir registros con emails falsos.

## ✅ Solución

Debes habilitar la **confirmación de email obligatoria** en Supabase Dashboard.

---

## 📋 Pasos para Configurar

### 1. Accede a tu Proyecto en Supabase

Visita: [https://supabase.com/dashboard](https://supabase.com/dashboard)

### 2. Ve a Authentication → Settings

Navega a:
```
Authentication → Settings → Email Auth
```

### 3. Habilita "Confirm Email"

Busca la opción:
```
☑️ Enable email confirmations
```

Y **actívala**.

### 4. Configura el Email Template (Opcional)

En `Authentication → Templates → Confirm signup`, puedes personalizar el email:

```html
<h2>Confirma tu cuenta en Celesta</h2>
<p>Hola {{ .FullName }},</p>
<p>Gracias por registrarte en Celesta. Confirma tu email haciendo clic en el siguiente enlace:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi email</a></p>
<p>Si no solicitaste esta cuenta, puedes ignorar este email.</p>
```

### 5. Configura la URL de Redirección

En `Authentication → URL Configuration`, asegúrate de tener:

```
Site URL: https://tu-dominio.com
Redirect URLs: https://tu-dominio.com/grupos
```

Para desarrollo local:
```
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/grupos
```

---

## 🧪 Cómo Probar

### 1. Registra un nuevo usuario

Ve a `/signup` y crea una cuenta con un email real que puedas verificar.

### 2. Verifica el flujo correcto

Después de registrarte, deberías ver:

```
✅ ¡Cuenta creada!
Hemos enviado un correo de confirmación a tu@email.com

Por favor, revisa tu bandeja de entrada y haz clic 
en el enlace de verificación para activar tu cuenta.

[Ir al inicio de sesión]
```

### 3. Revisa tu email

Busca un email de `noreply@mail.app.supabase.io` con el asunto **"Confirm Your Signup"**.

### 4. Confirma el email

Haz clic en el enlace del email. Serás redirigido a `/grupos` con tu sesión iniciada.

---

## 🐛 Debugging

Si después de configurar, aún te deja entrar sin confirmar email:

### Verifica que Supabase está configurado correctamente

En Supabase SQL Editor, ejecuta:

```sql
-- Ver configuración de Auth
SELECT * FROM auth.config;
```

Busca la columna `enable_signup` y `confirm_email_enabled`.

### Fuerza un nuevo registro

1. Borra el usuario de prueba anterior en `Authentication → Users`
2. Limpia las cookies del navegador (`Application → Storage → Clear site data`)
3. Intenta registrarte de nuevo

### Verifica logs en Supabase

En `Logs → Auth Logs`, busca eventos de tipo:
- `signup` - Cuando se registra
- `email_confirmation` - Cuando se confirma

---

## 📝 Código del Sistema

El código ya está implementado correctamente en:

### `src/lib/auth.ts:96-98`
```typescript
// Check if email confirmation is required
const needsConfirmation = authData.user.identities && 
                         authData.user.identities.length === 0;
```

### `src/app/signup/page.tsx:58-66`
```typescript
if (result.needsEmailConfirmation) {
  // Show confirmation message
  setNeedsEmailConfirmation(true);
} else {
  // Auto-login successful, redirect
  setTimeout(() => {
    router.push('/grupos');
  }, 2000);
}
```

El sistema **detecta automáticamente** si Supabase requiere confirmación de email, por lo que no necesitas cambiar código, **solo configurar Supabase**.

---

## 🔒 Seguridad Adicional (Opcional)

Para mayor seguridad, puedes agregar rate limiting al signup:

```typescript
// En .env.local
RATE_LIMIT_SIGNUP_PER_IP=5  # máximo 5 registros por IP por hora
```

Y configurar en Supabase:
```
Authentication → Rate Limits → Signup: 5 per hour per IP
```

---

## ✅ Checklist Final

- [ ] Habilitada confirmación de email en Supabase Dashboard
- [ ] Configuradas URLs de redirección
- [ ] Probado flujo completo de registro → email → confirmación
- [ ] Verificado que usuarios sin confirmar NO pueden acceder a `/grupos`
- [ ] Personalizado template de email (opcional)

---

**Documentado por**: Sentinel  
**Fecha**: 2025-10-04  
**Versión de Celesta**: MVP pre-piloto
