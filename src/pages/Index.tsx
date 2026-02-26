import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import HowItWorks from "@/components/HowItWorks";
import JobCategories from "@/components/JobCategories";
import TopCompanies from "@/components/TopCompanies";
import Stats from "@/components/Stats";
import Reviews from "@/components/Reviews";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Hero />
      <HowItWorks />
      <JobCategories />
      <TopCompanies />
      <Stats />
      <Reviews />
      <CTA />
      <Footer />
    </div>
  );
};

export default Index;
