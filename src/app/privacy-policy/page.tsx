// src/app/privacy-policy/page.tsx
import fs from 'fs';
import path from 'path';
import Container from '@/components/Container';
import { headingStyles, opacityVariants, textStyles } from '@/styles/typography';

const PrivacyPolicyPage = () => {
  // process.cwd() is the root of the Next.js project (Celesta directory)
  // termly.html is in the parent directory of Celesta (project-edTech)
  const filePath = path.join(process.cwd(), '..', 'termly.html');
  let htmlContent = '';
  let errorLoading = false;

  try {
    htmlContent = fs.readFileSync(filePath, 'utf8');
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
      {/* Adding a wrapper for some padding, assuming termly.html might not have its own full-page layout margins */}
      <div className="py-8 md:py-12 lg:py-16">
        <div dangerouslySetInnerHTML={{ __html: htmlContent }} />
      </div>
    </Container>
  );
};

export default PrivacyPolicyPage;
