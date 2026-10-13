/**
 * Copia un texto al portapapeles de la persona. Devuelve `true` si se pudo.
 *
 * Primero usa la API moderna; si el navegador no la ofrece (por ejemplo, en una
 * página sin conexión segura) prueba con un campo temporal. Nada sale del
 * navegador: copiar es una acción local.
 */
export async function copiarAlPortapapeles(texto: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(texto);
      return true;
    }
  } catch {
    // Se intenta el método de respaldo.
  }

  try {
    const campo = document.createElement('textarea');
    campo.value = texto;
    campo.setAttribute('readonly', '');
    campo.style.position = 'fixed';
    campo.style.top = '0';
    campo.style.left = '0';
    campo.style.opacity = '0';
    document.body.appendChild(campo);
    campo.select();
    const copiado = document.execCommand('copy');
    document.body.removeChild(campo);
    return copiado;
  } catch {
    return false;
  }
}
