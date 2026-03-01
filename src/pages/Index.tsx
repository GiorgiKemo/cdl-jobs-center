import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";

const HowItWorks = lazy(() => import("@/components/HowItWorks"));
const JobCategories = lazy(() => import("@/components/JobCategories"));
const TopCompanies = lazy(() => import("@/components/TopCompanies"));
const Stats = lazy(() => import("@/components/Stats"));
const Reviews = lazy(() => import("@/components/Reviews"));
const CTA = lazy(() => import("@/components/CTA"));

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <Hero />
        <Suspense fallback={null}>
          <HowItWorks />
          <JobCategories />
          <TopCompanies />
          <Stats />
          <Reviews />
          <CTA />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
