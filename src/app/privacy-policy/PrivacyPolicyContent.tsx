'use client';

import { useEffect, useState } from 'react';

interface PrivacyPolicyContentProps {
  htmlContent: string;
}

// Este componente se ejecuta en el cliente para evitar errores de hidratación.
const PrivacyPolicyContent: React.FC<PrivacyPolicyContentProps> = ({ htmlContent }) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Nos aseguramos de que el componente esté "montado" en el navegador antes de manipular el DOM.
    setIsMounted(true);
  }, []);

  // Limpiamos el HTML para que las clases de Tailwind (prose-invert) funcionen.
  const cleanedHtml = htmlContent
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Elimina los bloques <style>
    .replace(/style="[^"]*"/gi, ''); // Elimina todos los atributos de estilo en línea

  return (
    <div className="prose prose-invert max-w-none">
      {isMounted && (
        <div dangerouslySetInnerHTML={{ __html: cleanedHtml }} />
      )}
    </div>
  );
};

export default PrivacyPolicyContent;
