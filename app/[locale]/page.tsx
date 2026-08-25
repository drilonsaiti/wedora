import { PricingSection } from '@/components/pricing-section'
import {SiteHeader} from "@/components/landing/SiteHeader";
import {HeroSection} from "@/components/landing/HeroSection";
import {ValueSection} from "@/components/landing/ValueSection";
import {FeaturesSection} from "@/components/landing/FeaturesSection";
import {HowItWorksSection} from "@/components/landing/HowItWorksSection";
import {FaqSection} from "@/components/landing/FaqSection";
import {FinalCtaSection} from "@/components/landing/FinalCtaSection";
import {SiteFooter} from "@/components/landing/SiteFooter";

export default function PortfolioLandingPage() {
    return (
        <main className="min-h-screen overflow-hidden bg-background text-foreground">
            <SiteHeader />
            <HeroSection />
            <ValueSection />
            <FeaturesSection />
            <HowItWorksSection />

            <section id="pricing" className="px-6 py-24 lg:py-32">
                <PricingSection />
            </section>

            <FaqSection />
            <FinalCtaSection />
            <SiteFooter />
        </main>
    )
}