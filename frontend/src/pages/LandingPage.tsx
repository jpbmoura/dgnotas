import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { Nav } from '../components/landing/Nav';
import { Hero } from '../components/landing/Hero';
import { Integrations } from '../components/landing/Integrations';
import { HumanSupport } from '../components/landing/HumanSupport';
import { Features } from '../components/landing/Features';
import { HowItWorks } from '../components/landing/HowItWorks';
import { Testimonials } from '../components/landing/Testimonials';
import { Pricing } from '../components/landing/Pricing';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { Footer } from '../components/landing/Footer';

export function LandingPage() {
  useRevealOnScroll();

  return (
    <>
      <Nav />
      <Hero />
      <Integrations />
      <HumanSupport />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Pricing />
      <FAQ />
      <FinalCTA />
      <Footer />
    </>
  );
}
