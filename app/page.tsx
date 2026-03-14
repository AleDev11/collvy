import type { Metadata } from "next"
import { Header } from "@/components/landing/header"
import { Hero } from "@/components/landing/hero"
import { Features } from "@/components/landing/features"
import { Pricing } from "@/components/landing/pricing"
import { Footer } from "@/components/landing/footer"

export const metadata: Metadata = {
  title: "Collvy — Your team's workspace",
  description: "Kanban boards, team docs, and task planning — all in one place. Open source and self-hostable.",
  alternates: { canonical: "/" },
}

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Collvy",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Kanban boards, team docs, and task planning — all in one place. Open source and self-hostable.",
  offers: [
    { "@type": "Offer", price: "0",  priceCurrency: "USD", name: "Free (Self-hosted)" },
    { "@type": "Offer", price: "8",  priceCurrency: "USD", name: "Pro",      billingIncrement: "monthly" },
    { "@type": "Offer", price: "15", priceCurrency: "USD", name: "Business", billingIncrement: "monthly" },
  ],
  url: process.env.AUTH_URL ?? "https://collvy.com",
  sameAs: ["https://github.com/AleDev11/collvy"],
}

export default function Page() {
  return (
    <div className="min-h-svh">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Header />
      <main>
        <Hero />
        <Features />
        <Pricing />
      </main>
      <Footer />
    </div>
  )
}
