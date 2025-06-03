'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import TrustSection from '@/components/TrustSection';
import ProductSection from '@/components/ProductSection';
import MetricsSection from '@/components/MetricsSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-general-sans">
      <Navbar />
      <main className="font-nunito">
        <Hero />
        <TrustSection />
        <ProductSection />
        <MetricsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}