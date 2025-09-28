"use client";
import { useEffect } from "react";

export default function AliasGuard({ token }: { token: string }) {
  useEffect(() => {
    const t = token || "";
    try {
      const key = `celesta:alias:${t || "__global__"}`;
      const alias = localStorage.getItem(key);
      if (!alias || alias.trim().length === 0) {
        const url = new URL(window.location.href);
        const currentT = url.searchParams.get("t") || t;
        window.location.replace(`/join?t=${encodeURIComponent(currentT)}`);
      }
    } catch {
      // If localStorage fails, be safe and route to join
      if (t) window.location.replace(`/join?t=${encodeURIComponent(t)}`);
    }
  }, [token]);
  return null;
}
