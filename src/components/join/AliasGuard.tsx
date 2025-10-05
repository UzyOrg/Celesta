"use client";
import { useEffect } from "react";

/**
 * AliasGuard: Verifica que el usuario tenga un alias antes de acceder a contenido protegido
 * Busca alias en este orden:
 * 1. Alias específico del token (celesta:alias:DEMO-101)
 * 2. Alias global (celesta:alias:__global__)
 * Si no encuentra alias, redirige a /join
 */
export default function AliasGuard({ token }: { token: string }) {
  useEffect(() => {
    const t = token || "";
    try {
      // Buscar alias específico del token
      const tokenKey = `celesta:alias:${t || "__global__"}`;
      let alias = localStorage.getItem(tokenKey);
      
      // Fallback: buscar alias global si no hay alias específico del token
      if ((!alias || alias.trim().length === 0) && t && t !== "__global__") {
        const globalKey = `celesta:alias:__global__`;
        alias = localStorage.getItem(globalKey);
        
        // Si encontramos alias global, copiarlo al token específico para futuras consultas
        if (alias && alias.trim().length > 0) {
          localStorage.setItem(tokenKey, alias);
          console.log(`[AliasGuard] Copied global alias "${alias}" to token ${t}`);
          return; // Alias encontrado, no redirigir
        }
      }
      
      // Si no hay alias en ninguna key, redirigir a /join
      if (!alias || alias.trim().length === 0) {
        const currentUrl = window.location.pathname + window.location.search;
        const redirectParam = encodeURIComponent(currentUrl);
        
        const url = new URL(window.location.href);
        const currentT = url.searchParams.get("t") || t || "DEMO-101";
        
        console.log(`[AliasGuard] No alias found, redirecting to /join?t=${currentT}`);
        
        // Redirigir a /join con token y URL de retorno
        window.location.replace(
          `/join?t=${encodeURIComponent(currentT)}&redirect=${redirectParam}`
        );
      } else {
        console.log(`[AliasGuard] Alias found: "${alias}" for token: ${t || "__global__"}`);
      }
    } catch (e) {
      console.error('[AliasGuard] Error:', e);
      // If localStorage fails, be safe and route to join
      const currentUrl = window.location.pathname + window.location.search;
      const redirectParam = encodeURIComponent(currentUrl);
      const fallbackToken = t || "DEMO-101";
      window.location.replace(
        `/join?t=${encodeURIComponent(fallbackToken)}&redirect=${redirectParam}`
      );
    }
  }, [token]);
  return null;
}
