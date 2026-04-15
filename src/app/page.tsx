"use client";

import { Header } from "@/components/ui/Header";
import { Sidebar } from "@/components/ui/Sidebar";
import { HeroSection } from "@/components/sections/HeroSection";
import { BenchmarkSection } from "@/components/sections/BenchmarkSection";
import { ChainHealthSection } from "@/components/sections/ChainHealthSection";
import { EcosystemActivitySection } from "@/components/sections/EcosystemActivitySection";
import { RetentionSection } from "@/components/sections/RetentionSection";
import { StablecoinSection } from "@/components/sections/StablecoinSection";
import { DexSection } from "@/components/sections/DexSection";
import { MppSection } from "@/components/sections/MppSection";
import { TransfersSection } from "@/components/sections/TransfersSection";
import { Footer } from "@/components/sections/Footer";

export default function Page() {
  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <Header />
      <div className="mx-auto max-w-[1440px] flex gap-8 px-6">
        <Sidebar />
        <main className="flex-1 min-w-0 py-6 space-y-24">
          <HeroSection />
          <BenchmarkSection />
          <ChainHealthSection />
          <EcosystemActivitySection />
          <RetentionSection />
          <StablecoinSection />
          <DexSection />
          <MppSection />
          <TransfersSection />
        </main>
      </div>
      <Footer />
    </div>
  );
}
