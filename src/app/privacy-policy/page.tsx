// src/app/privacy-policy/page.tsx
import Container from '@/components/Container';
import { headingStyles, opacityVariants, textStyles } from '@/styles/typography';

// This is now an async Server Component
const PrivacyPolicyPage = async () => {
  let htmlContent = '';
  let errorLoading = false;

  try {
    // Fetch the content from the public directory.
    // This fetch runs on the server.
    // Using a cache option like 'no-store' ensures you get the latest version during development,
    // or 'force-cache' if the content rarely changes and you want to optimize.
    // For production, consider revalidating strategies if the HTML can change without a new build.
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/termly.html`, {
      cache: 'no-store', // Or 'force-cache' or configure revalidation
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch privacy policy: ${response.status} ${response.statusText}`);
    }
    htmlContent = await response.text();
  } catch (error) {
    console.error('Error fetching privacy policy file (termly.html):', error);
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
