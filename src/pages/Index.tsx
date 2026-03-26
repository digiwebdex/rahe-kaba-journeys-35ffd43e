import { lazy, Suspense } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import ServicesSection from "@/components/ServicesSection";
import PackagesSection from "@/components/PackagesSection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import BackToTop from "@/components/BackToTop";

// Lazy load below-fold sections
const GuidelineSection = lazy(() => import("@/components/GuidelineSection"));
const VideoGuideSection = lazy(() => import("@/components/VideoGuideSection"));
const GallerySection = lazy(() => import("@/components/GallerySection"));
const TestimonialsSection = lazy(() => import("@/components/TestimonialsSection"));
const AboutSection = lazy(() => import("@/components/AboutSection"));
const ContactSection = lazy(() => import("@/components/ContactSection"));

const SectionFallback = () => <div className="py-20" />;

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <PackagesSection />
      <Suspense fallback={<SectionFallback />}>
        <GuidelineSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <VideoGuideSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <GallerySection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <TestimonialsSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <AboutSection />
      </Suspense>
      <Suspense fallback={<SectionFallback />}>
        <ContactSection />
      </Suspense>
      <Footer />
      <WhatsAppFloat />
      <BackToTop />
    </div>
  );
};

export default Index;
