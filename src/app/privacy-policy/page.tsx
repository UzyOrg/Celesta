// src/app/privacy-policy/page.tsx
import Container from '@/components/Container';
import fs from 'fs/promises';
import path from 'path';
import PrivacyPolicyContent from './PrivacyPolicyContent'; // Importamos el nuevo componente

// Este es un Server Component. Su única tarea es leer el archivo.
const PrivacyPolicyPage = async () => {
  let htmlContent = '';
  let errorLoading = false;

  try {
    const filePath = path.join(process.cwd(), 'public', 'termly.html');
    // Leemos el contenido "sucio" sin modificarlo aquí en el servidor.
    htmlContent = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    console.error('Error reading privacy policy file:', error);
    errorLoading = true;
  }

  if (errorLoading) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="text-2xl font-bold text-white">Privacy Policy</h1>
          <p className="text-red-500 mt-4">
            Could not load the privacy policy. Please try again later.
          </p>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="mx-auto max-w-4xl py-12 md:py-16 lg:py-20">
        {/* Pasamos el HTML "sucio" al componente de cliente para que él lo limpie y muestre. */}
        <PrivacyPolicyContent htmlContent={htmlContent} />
      </div>
    </Container>
  );
};

export default PrivacyPolicyPage;
