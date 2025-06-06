// src/app/privacy-policy/page.tsx
import Container from '@/components/Container';
import { headingStyles, opacityVariants, textStyles } from '@/styles/typography';
import fs from 'fs/promises'; // Importar fs/promises
import path from 'path';     // Importar path

// This is now an async Server Component
const PrivacyPolicyPage = async () => {
  let htmlContent = '';
  let errorLoading = false;

  try {
    // Construir la ruta al archivo en la carpeta public
    const filePath = path.join(process.cwd(), 'public', 'termly.html');
    // Leer el archivo directamente
    htmlContent = await fs.readFile(filePath, 'utf8');

  } catch (error) {
    console.error('Error reading privacy policy file (termly.html):', error);
    errorLoading = true;
  }

  if (errorLoading) {
    return (
      <Container>
        <article className="mx-auto py-12 md:py-16 lg:py-20 text-center">
          <h1 className={`${headingStyles.h1} ${opacityVariants.primary} mb-6`}>
            Privacy Policy
          </h1>
          <p className={`${textStyles.largeBody} ${opacityVariants.secondary} text-red-500`}>
            We encountered an issue loading the privacy policy. Please try again later or contact support.
          </p>
        </article>
      </Container>
    );
  }

  return (
    <Container>
      {/* Adding a wrapper for some padding */}
      <div className="py-8 md:py-12 lg:py-16 prose max-w-none">
        {/* The 'prose' class from Tailwind Typography can help style raw HTML */}
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    </Container>
  );
};

export default PrivacyPolicyPage;
