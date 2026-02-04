import Link from "next/link";
import { ArrowRight, Sprout, Users } from "lucide-react";

// BACKUP: Card-based hero design - soft, minimal with rounded container
export default function HeroCardDesign() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30">
      {/* Hero Section with Navigation - Card Container */}
      <section className="min-h-screen p-6 lg:p-8 flex items-center justify-center">
        <div className="w-full max-w-[1400px] bg-gradient-to-br from-white/80 via-stone-50/60 to-rose-50/40 rounded-[3rem] shadow-2xl overflow-hidden relative backdrop-blur-sm border border-white/60">

          {/* Navigation - Inside card */}
          <nav className="relative z-50 px-8 lg:px-12 py-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sprout className="w-8 h-8 text-[#536d3d]" />
              </div>
              <div className="hidden lg:flex items-center gap-10 text-[15px]">
                <a href="/" className="text-gray-700 hover:text-[#536d3d] transition-colors font-medium">Homepage</a>
                <a href="#how-it-works" className="text-gray-700 hover:text-[#536d3d] transition-colors font-medium">Platform</a>
                <a href="#why-cultivate" className="text-gray-700 hover:text-[#536d3d] transition-colors font-medium">About Us</a>
                <a href="#trust" className="text-gray-700 hover:text-[#536d3d] transition-colors font-medium">Careers</a>
                <a href="#contact" className="text-gray-700 hover:text-[#536d3d] transition-colors font-medium">Contact Us</a>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href="/signup"
                  className="bg-[#85b878] hover:bg-[#536d3d] text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  Sign Up
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/login"
                  className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                >
                  Login
                  <Users className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </nav>

          {/* Hero Content */}
          <div className="relative px-8 lg:px-12 pb-16 pt-8 lg:pt-16">
            <div className="grid lg:grid-cols-2 gap-16 items-center min-h-[600px]">

              {/* Left side - Decorative gradient sphere */}
              <div className="relative flex items-center justify-center lg:justify-start">
                {/* Large gradient ball */}
                <div className="relative w-[400px] h-[400px] lg:w-[500px] lg:h-[500px]">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#85b878]/60 via-[#608e96]/50 to-[#536d3d]/40 blur-2xl opacity-80"></div>
                  <div className="absolute inset-8 rounded-full bg-gradient-to-br from-[#85b878] via-[#608e96] to-[#536d3d] shadow-2xl"></div>
                </div>

                {/* Try Demo Button - Bottom Left */}
                <div className="absolute bottom-0 left-0">
                  <Link
                    href="/signup"
                    className="group bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-full transition-all duration-300 font-medium shadow-lg hover:shadow-xl border-2 border-gray-200 inline-flex items-center gap-2"
                  >
                    Start Free Trial
                  </Link>
                </div>
              </div>

              {/* Right side - Text content */}
              <div className="space-y-6 lg:pr-12">
                <div className="space-y-3">
                  <h1 className="text-6xl lg:text-8xl font-bold leading-[1.1] font-serif">
                    <span className="text-[#4a3728]">Expert farming</span>
                    <br />
                    <span className="text-[#4a3728]">advice,</span>
                    <br />
                    <span className="relative inline-block text-[#85b878]">
                      anytime
                      <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 400 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 15C50 8 150 5 200 8C250 11 350 10 395 12" stroke="#85b878" strokeWidth="6" strokeLinecap="round" opacity="0.4"/>
                      </svg>
                    </span>
                  </h1>
                </div>

                <p className="text-lg lg:text-xl text-gray-600 leading-relaxed max-w-xl pt-4">
                  Get instant, AI-powered agricultural guidance from agronomist-trained agents.
                  Available 24/7, personalized to your crops and location across Ghana.
                </p>
              </div>

            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
