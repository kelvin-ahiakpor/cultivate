import Image from "next/image";
import { auth } from "@/auth";
import { LandingNav } from "@/components/landing-nav";
import { ScrollFadeIn } from "@/components/scroll-fade-in";

export default async function HomePage() {
  const session = await auth();
  return (
    <>
      {/* First Page - Hero with Lettuce Background */}
      <div className="min-h-screen w-full relative bg-cultivate-cream-light">
        {/* Background — mobile: <Image> element for positioning control, desktop: CSS bg */}
        <div className="absolute inset-0 lg:hidden overflow-hidden">
          <Image
            src="/images/landing-bg-4.png"
            alt=""
            width={1080}
            height={1920}
            // mt-[38%] calibrated on iPhone 15 (9:19.5) so image bottom aligns with viewport bottom.
            // This value may need adjusting for other aspect ratios. TODO: make dynamic (e.g. calc or JS).
            className="w-[150%] h-auto mt-[38%]"
            priority
          />
        </div>
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat hidden lg:block"
          style={{ backgroundImage: 'url(/images/landing-bg-1.png)' }}
        />
        {/* Light overlay for text readability - very subtle */}
        <div className="absolute inset-0 bg-gradient-to-br from-cultivate-cream/30 via-transparent to-cultivate-cream/20"></div>

        {/* Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          <LandingNav session={session} />

          {/* Heading — centered on mobile, top right on desktop */}
          <div className="flex justify-center lg:justify-end px-4 lg:px-16 pt-8 lg:pt-12">
            <div className="max-w-2xl text-center lg:text-right">
              <h1 className="text-4xl sm:text-5xl lg:text-8xl font-bold leading-[1.1] font-serif">
                <span className="text-cultivate-brown-dark">Expert farming</span>
                <br />
                <span className="text-cultivate-brown-dark">advice,</span>
                <br />
                <span className="relative inline-block text-cultivate-green-light">
                  anytime
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 15C50 8 150 5 200 8C250 11 350 10 395 12" stroke="#85b878" strokeWidth="6" strokeLinecap="round" opacity="0.4"/>
                  </svg>
                </span>
              </h1>

              {/* Tagline — mobile only, near heading */}
              <p className="lg:hidden mt-16 sm:mt-20 text-base sm:text-lg text-gray-800 leading-relaxed">
                AI-powered agricultural guidance from agronomist-trained agents.
              </p>
            </div>
          </div>

          {/* Subtitle — bottom right */}
          <div className="flex-1 flex items-end justify-center lg:justify-end px-4 lg:px-16 pb-8 lg:pb-12">
            <div className="max-w-2xl text-center lg:text-right">
              {/* Mobile: only second sentence */}
              <p className="lg:hidden text-base sm:text-lg text-gray-800 leading-relaxed">
                Available 24/7, personalized to your crops and location.
              </p>
              {/* Desktop: full paragraph as original */}
              <p className="hidden lg:block text-xl text-gray-800 leading-relaxed">
                AI-powered agricultural guidance from agronomist-trained agents.
                Available 24/7, personalized to your crops and location.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Platform Section */}
      <section
        id="platform"
        className="relative"
        style={{
          backgroundImage: 'url(/images/landing-bg-2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#F9F3EF'
        }}
      >
        <div className="absolute inset-0 bg-cultivate-cream/20"></div>

        {/* Mobile layout — stacked cards (hidden on lg) */}
        <div className="relative z-10 lg:hidden min-h-screen pt-20 pb-12 px-4 flex flex-col justify-start">
          <div className="text-center mb-36">
            <h3 className="text-2xl font-bold text-cultivate-green-alt uppercase tracking-wide">Why Use</h3>
            <h2 className="text-5xl font-black text-cultivate-amber tracking-wider font-serif">Cultivate</h2>
          </div>
          <div className="space-y-4 max-w-sm mx-auto">
            {[
              { src: "/images/icons/timely.svg", alt: "24/7", text: "Get 24/7 expert agricultural advice outside office hours" },
              { src: "/images/icons/expert.svg", alt: "Expert", text: "Speak to AI Agents configured by Farmitecture's agronomists." },
              { src: "/images/icons/personalized.svg", alt: "Personalized", text: "Advice tailored to your crops, location and farming style" },
              { src: "/images/icons/intervention.svg", alt: "Verified", text: "Flag queries for human review when AI isn't confident" },
            ].map(({ src, alt, text }, i) => (
              <ScrollFadeIn key={alt} delay={i * 120}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <Image
                  src={src}
                  alt={alt}
                  width={40}
                  height={40}
                  className="flex-shrink-0 mt-0.5"
                  style={{ filter: 'brightness(0) saturate(100%) invert(26%) sepia(45%) saturate(1613%) hue-rotate(139deg) brightness(96%) contrast(101%)' }}
                />
                <p className="text-base font-bold text-cultivate-green-alt leading-relaxed">{text}</p>
              </div>
              </ScrollFadeIn>
            ))}
          </div>
        </div>

        {/* Desktop layout — absolute 4-corner positioning (hidden on mobile) */}
        <div className="relative z-10 hidden lg:block h-screen py-12 px-8 lg:px-16">
          <div className="max-w-7xl mx-auto w-full h-full">

            {/* Title */}
            <div className="text-center mb-16 pt-4">
              <div className="space-y-2">
                <h3 className="text-3xl lg:text-4xl font-bold text-cultivate-green-alt uppercase tracking-wide">
                  Why Use
                </h3>
                <h2 className="text-6xl lg:text-7xl font-black text-cultivate-amber tracking-wider font-serif">
                  Cultivate
                </h2>
              </div>
            </div>

            {/* Benefits positioned around central image */}
            <div className="relative h-[calc(100%-200px)]">

              {/* Benefit 1 - 24/7 Availability (Top Left) */}
              <div className="absolute top-26 left-0 max-w-xs">
                <div className="flex flex-col items-end">
                  <Image
                    src="/images/icons/timely.svg"
                    alt="24/7 Icon"
                    width={48}
                    height={48}
                    className="mb-3"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(26%) sepia(45%) saturate(1613%) hue-rotate(139deg) brightness(96%) contrast(101%)'
                    }}
                  />
                  <p className="text-xl font-bold text-cultivate-green-alt leading-relaxed text-right">
                    Get 24/7 expert agricultural advice outside office hours
                  </p>
                </div>
              </div>

              {/* Benefit 2 - Expert-Trained AI (Top Right) */}
              <div className="absolute top-26 right-0 max-w-xs">
                <div className="flex flex-col items-start">
                  <Image
                    src="/images/icons/expert.svg"
                    alt="Expert Icon"
                    width={48}
                    height={48}
                    className="mb-3"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(26%) sepia(45%) saturate(1613%) hue-rotate(139deg) brightness(96%) contrast(101%)'
                    }}
                  />
                  <p className="text-xl font-bold text-cultivate-green-alt leading-relaxed text-left">
                    Speak to AI Agents configured by Farmitecture's agronomists.
                  </p>
                </div>
              </div>

              {/* Benefit 3 - Personalized Guidance (Bottom Left) */}
              <div className="absolute bottom-36 left-0 max-w-xs">
                <div className="flex flex-col items-end">
                  <Image
                    src="/images/icons/personalized.svg"
                    alt="Personalized Icon"
                    width={48}
                    height={48}
                    className="mb-3"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(26%) sepia(45%) saturate(1613%) hue-rotate(139deg) brightness(96%) contrast(101%)'
                    }}
                  />
                  <p className="text-xl font-bold text-cultivate-green-alt leading-relaxed text-right">
                    Advice tailored to your crops, location and farming style
                  </p>
                </div>
              </div>

              {/* Benefit 4 - Human Escalation (Bottom Right) */}
              <div className="absolute bottom-36 right-0 max-w-xs">
                <div className="flex flex-col items-start">
                  <Image
                    src="/images/icons/intervention.svg"
                    alt="Verified Icon"
                    width={48}
                    height={48}
                    className="mb-3"
                    style={{
                      filter: 'brightness(0) saturate(100%) invert(26%) sepia(45%) saturate(1613%) hue-rotate(139deg) brightness(96%) contrast(101%)'
                    }}
                  />
                  <p className="text-xl font-bold text-cultivate-green-alt leading-relaxed text-left">
                    Flag queries for human review when AI isn't confident
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="bg-cultivate-cream-light py-24 px-4 lg:px-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-2xl lg:text-3xl font-bold text-cultivate-green-alt uppercase tracking-wide mb-3">About Us</h3>
            <h2 className="text-5xl lg:text-6xl font-black text-cultivate-amber font-serif">The Story</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <p className="text-lg text-cultivate-brown-dark leading-relaxed">
                Ghana has one of the most severe agricultural extension gaps in West Africa — with a ratio of <strong>1 agronomist for every 1,500 farmers</strong>, most smallholders go weeks or months without expert guidance during critical growing seasons.
              </p>
              <p className="text-lg text-cultivate-brown-dark leading-relaxed">
                Cultivate was built to change that. Developed as a capstone project at <strong>Ashesi University</strong> in partnership with <strong>Farmitecture</strong> — an Accra-based urban farming startup — the platform lets agronomists train AI agents with their own knowledge, so farmers can get expert advice 24/7.
              </p>
              <p className="text-lg text-cultivate-brown-dark leading-relaxed">
                Farmitecture serves over 70 customers across Greater Accra with a team of 2 agronomists. Cultivate lets those agronomists scale their expertise to every farmer on the platform, without being stretched thin.
              </p>
            </div>

            <div className="space-y-4">
              {[
                { label: "Ashesi University", desc: "Built as a Computer Science capstone project, Spring 2026" },
                { label: "Farmitecture", desc: "Accra-based urban farming startup, pilot partner" },
                { label: "1 : 1,500", desc: "Agronomist-to-farmer ratio in Ghana — the problem we're solving" },
                { label: "Ghana-first", desc: "Designed for Ghanaian crops, climate, and farming seasons" },
              ].map(({ label, desc }) => (
                <div key={label} className="bg-white rounded-2xl p-5 shadow-sm border border-cultivate-beige/40">
                  <p className="font-bold text-cultivate-green-dark text-base">{label}</p>
                  <p className="text-cultivate-brown-dark/80 text-sm mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="bg-cultivate-green-dark py-24 px-4 lg:px-16">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl lg:text-3xl font-bold text-cultivate-green-light uppercase tracking-wide mb-3">Contact Us</h3>
          <h2 className="text-5xl lg:text-6xl font-black text-white font-serif mb-8">Get in Touch</h2>
          <p className="text-cultivate-beige text-lg leading-relaxed mb-12">
            Interested in bringing Cultivate to your organization, or want to learn more about the project?
            We&apos;d love to hear from you.
          </p>

          <div className="grid sm:grid-cols-2 gap-6 text-left">
            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-cultivate-green-light font-bold uppercase tracking-wide text-sm mb-2">Developer</p>
              <p className="text-white font-semibold text-lg">Kelvin Ahiakpor</p>
              <p className="text-cultivate-beige/80 text-sm mt-1">Computer Science, Ashesi University</p>
              <a
                href="mailto:kelvin.ahiakpor@ashesi.edu.gh"
                className="inline-block mt-3 text-cultivate-green-light hover:text-white transition-colors text-sm font-medium"
              >
                kelvin.ahiakpor@ashesi.edu.gh
              </a>
            </div>

            <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-sm">
              <p className="text-cultivate-green-light font-bold uppercase tracking-wide text-sm mb-2">Partner Organization</p>
              <p className="text-white font-semibold text-lg">Farmitecture</p>
              <p className="text-cultivate-beige/80 text-sm mt-1">Urban farming startup, Accra, Ghana</p>
              <a
                href="https://farmitecture.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-3 text-cultivate-green-light hover:text-white transition-colors text-sm font-medium"
              >
                farmitecture.com
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
