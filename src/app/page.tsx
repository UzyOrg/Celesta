'use client';

import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import ProductSection from '@/components/ProductSection';
import MetricsSection from '@/components/MetricsSection';
import ManifiestoSection from '@/components/ManifiestoSection';
import CTASection from '@/components/CTASection';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D1117] text-white font-general-sans">
      <Navbar />
      <main className="font-nunito">
        <Hero />
        <div id="product">
          <ProductSection />
        </div>
        <div id="solutions">
          <MetricsSection />
        </div>
        <div id="El-problema">
          <ManifiestoSection />
        </div>
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}