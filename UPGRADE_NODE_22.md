# 🚀 Actualización a Node.js 22

**Fecha:** 2025-10-03  
**Razón:** Requisito de Vercel (deadline: 31 de agosto 2025)

---

## ✅ Archivos Actualizados

### 1. `package.json`
```json
"engines": {
  "node": ">=22.0.0"
}
```
Especifica que el proyecto requiere Node.js 22 o superior.

### 2. `.nvmrc`
```
22
```
Archivo para NVM (Node Version Manager) que especifica la versión exacta.

### 3. `vercel.json`
```json
{
  "buildCommand": "next build",
  "framework": "nextjs",
  "regions": ["iad1"],
  "functions": {
    "app/api/**": {
      "maxDuration": 10
    }
  }
}
```
Configuración explícita para Vercel (usa Node.js 22 por defecto con Next.js 15).

---

## 🔧 Actualizar Node.js Localmente

### Windows (Recomendado: nvm-windows)

**1. Instalar nvm-windows:**
```powershell
# Descargar desde:
https://github.com/coreybutler/nvm-windows/releases

# Instalar nvm-setup.exe
```

**2. Instalar Node.js 22:**
```powershell
# Ver versiones disponibles
nvm list available

# Instalar Node.js 22 LTS
nvm install 22

# Usar Node.js 22
nvm use 22

# Verificar
node -v
# Debe mostrar: v22.x.x
```

**3. Reinstalar dependencias:**
```powershell
# Borrar node_modules y lockfile
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml

# Reinstalar con pnpm
pnpm install
```

---

### Alternativa: Instalador Oficial

**1. Desinstalar Node.js viejo:**
```
Panel de Control → Programas → Desinstalar Node.js
```

**2. Descargar Node.js 22 LTS:**
```
https://nodejs.org/
```

**3. Instalar y verificar:**
```powershell
node -v
# Debe mostrar: v22.x.x

npm -v
# Debe mostrar: 10.x.x
```

**4. Reinstalar pnpm:**
```powershell
npm install -g pnpm
pnpm install
```

---

## 🧪 Verificación

### 1. Verificar versión local:
```powershell
node -v
# Esperado: v22.x.x
```

### 2. Verificar build local:
```powershell
pnpm run build
# Debe completar sin errores
```

### 3. Verificar Vercel:
```powershell
# Push a GitHub (trigger deploy)
git add .
git commit -m "chore: upgrade to Node.js 22"
git push origin main
```

**En Vercel Dashboard:**
- Settings → General → Node.js Version → Debe mostrar "22.x" (automático)

---

## 🔍 Troubleshooting

### Error: "Cannot find module"

**Solución:**
```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item pnpm-lock.yaml
pnpm install
```

---

### Error: "pnpm command not found"

**Solución:**
```powershell
npm install -g pnpm
```

---

### Error en Vercel: "Build failed"

**Verificar:**
1. `package.json` tiene `"engines": { "node": ">=22.0.0" }`
2. Build local funciona: `pnpm run build`
3. Vercel Settings → General → Framework Preset: `Next.js`

---

## 📋 Checklist de Actualización

- [x] `package.json` → engines actualizado
- [x] `.nvmrc` → creado con versión 22
- [x] `vercel.json` → configuración de Vercel
- [ ] Node.js 22 instalado localmente
- [ ] Dependencias reinstaladas (`pnpm install`)
- [ ] Build local exitoso (`pnpm run build`)
- [ ] Deploy en Vercel exitoso
- [ ] App funcionando en producción

---

## 🎯 Próximos Pasos

1. **Actualizar Node.js localmente** (ver instrucciones arriba)
2. **Reinstalar dependencias:**
   ```powershell
   pnpm install
   ```
3. **Verificar build:**
   ```powershell
   pnpm run build
   ```
4. **Hacer commit y push:**
   ```powershell
   git add .
   git commit -m "chore: upgrade to Node.js 22"
   git push origin main
   ```
5. **Verificar deploy en Vercel:**
   - Ir a: https://vercel.com/dashboard
   - Ver logs del deploy
   - Verificar que usa Node.js 22

---

## ✅ Beneficios de Node.js 22

| Feature | Descripción |
|---------|-------------|
| **Performance** | ~10% más rápido en I/O |
| **ESM Support** | Mejor soporte para módulos ES |
| **Fetch API** | Fetch nativo (más rápido) |
| **Test Runner** | Test runner built-in |
| **Security** | Últimas actualizaciones de seguridad |

---

## 📚 Referencias

- [Node.js 22 Release Notes](https://nodejs.org/en/blog/release/v22.0.0)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/runtimes/node-js)
- [Next.js 15 Requirements](https://nextjs.org/docs/upgrading)

---

**Actualización completada exitosamente.** ✅
