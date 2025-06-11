import React, { Suspense } from 'react';
import SummaryPageContent from './SummaryPageContent';

// Define a loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-xl text-white/70">Cargando resumen...</p>
    {/* You can add a spinner or a more sophisticated skeleton loader here */}
  </div>
);

const DemoSummaryPage: React.FC = () => {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SummaryPageContent />
    </Suspense>
  );
};

export default DemoSummaryPage;
