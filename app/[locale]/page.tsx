import { PricingSection } from '@/components/pricing-section'
import {SiteHeader} from "@/components/SiteHeader";
import {HeroSection} from "@/components/HeroSection";
import {ValueSection} from "@/components/ValueSection";
import {FeaturesSection} from "@/components/FeaturesSection";
import {HowItWorksSection} from "@/components/HowItWorksSection";
import {FaqSection} from "@/components/FaqSection";
import {FinalCtaSection} from "@/components/FinalCtaSection";
import {SiteFooter} from "@/components/SiteFooter";

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