"use client";
import { useEffect } from "react";

/**
 * SimpleAliasGuard: Verifica que el usuario tenga ALGÚN alias antes de acceder
 * No requiere un token específico, solo verifica que exista al menos un alias guardado
 * Si no encuentra alias, redirige a /join
 */
export default function SimpleAliasGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      // Buscar cualquier alias en localStorage
      let hasAlias = false;
      
      // Buscar en orden de prioridad
      const priorityKeys = [
        'celesta:alias:DEMO-101',
        'celesta:alias:__global__'
      ];
      
      for (const key of priorityKeys) {
        const alias = localStorage.getItem(key);
        if (alias && alias.trim().length > 0) {
          hasAlias = true;
          break;
        }
      }
      
      // Si no encontramos en las keys prioritarias, buscar cualquier alias
      if (!hasAlias) {
        const allKeys = Object.keys(localStorage).filter(k => k.startsWith('celesta:alias:'));
        for (const key of allKeys) {
          const alias = localStorage.getItem(key);
          if (alias && alias.trim().length > 0) {
            hasAlias = true;
            break;
          }
        }
      }
      
      // Si no hay alias, redirigir a /join
      if (!hasAlias) {
        const currentUrl = window.location.pathname + window.location.search;
        const redirectParam = encodeURIComponent(currentUrl);
        window.location.replace(`/join?redirect=${redirectParam}`);
      }
    } catch (e) {
      console.error('[SimpleAliasGuard] Error:', e);
      // Si hay error, redirigir por seguridad
      const currentUrl = window.location.pathname + window.location.search;
      const redirectParam = encodeURIComponent(currentUrl);
      window.location.replace(`/join?redirect=${redirectParam}`);
    }
  }, []);
  
  return null;
}
