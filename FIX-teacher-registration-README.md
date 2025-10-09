# FIX: Registro de Docentes - Problema y Solución

## 🐛 Problema Identificado

Cuando un docente se registra usando `/signup`:
1. ✅ El usuario se crea correctamente en `auth.users` de Supabase
2. ❌ **NO** se crea automáticamente en la tabla `public.teachers`
3. ❌ El docente puede iniciar sesión pero no aparece en la base de datos
4. ❌ No se envía email de confirmación (posible problema de configuración de Supabase)

## 🔧 Solución

### Paso 1: Aplicar migración SQL en Supabase

1. Abre el **SQL Editor** en tu dashboard de Supabase
2. Copia y pega el contenido del archivo `FIX-teacher-registration.sql`
3. Ejecuta la migración

**Esta migración hará lo siguiente:**
- Crea la tabla `public.teachers` si no existe
- Habilita RLS (Row Level Security)
- Crea políticas de seguridad para que los docentes solo vean sus propios datos
- **Crea un TRIGGER** que automáticamente inserta en `public.teachers` cuando se crea un usuario en `auth.users`
- Crea un trigger para mantener sincronizados los updates

### Paso 2: Backfill de usuarios existentes (si aplica)

Si ya tienes usuarios en `auth.users` que no están en `public.teachers`, ejecuta:

```sql
INSERT INTO public.teachers (id, email, full_name, created_at, updated_at)
SELECT 
  id, 
  email, 
  COALESCE(raw_user_meta_data->>'full_name', '') as full_name,
  created_at,
  updated_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

### Paso 3: Configurar emails de confirmación en Supabase

1. Ve a **Authentication > Email Templates** en Supabase
2. Verifica que el template "Confirm signup" esté configurado
3. Ve a **Authentication > Providers > Email**
4. Asegúrate de que:
   - ✅ "Enable email confirmations" esté activado
   - ✅ "Secure email change" esté configurado según tus necesidades

### Paso 4: Probar el registro

1. Ve a `/signup`
2. Registra un nuevo docente
3. Verifica en Supabase que:
   - Existe en `auth.users`
   - Existe en `public.teachers`
   - Se envió el email de confirmación

## 🔄 Corrección de Logout

También se corrigió el problema de logout:
- **Antes:** Redirigía a `/login` (404)
- **Ahora:** Redirige a `/pilot-login` ✅

**Archivo modificado:** `src/lib/session.ts` línea 188

## 📋 Archivos Modificados

- ✅ `src/lib/session.ts` - Logout redirige a `/pilot-login`
- ✅ `src/app/signup/page.tsx` - Botones redirigen a `/pilot-login`
- ✅ `FIX-teacher-registration.sql` - Migración SQL para auto-insert de teachers

## ✅ Testing

Después de aplicar la migración, prueba:

1. **Registro nuevo:**
   ```
   Nombre: Test Teacher
   Email: test@example.com
   Password: password123
   ```

2. **Verificar en Supabase:**
   ```sql
   SELECT * FROM auth.users WHERE email = 'test@example.com';
   SELECT * FROM public.teachers WHERE email = 'test@example.com';
   ```

3. **Login:**
   - Ve a `/pilot-login`
   - Inicia sesión con las credenciales
   - Deberías llegar a `/grupos`

4. **Logout:**
   - Cierra sesión
   - Deberías volver a `/pilot-login`
