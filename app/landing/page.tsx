import Link from "next/link";
import { ArrowRight, Sprout, Users, MessageSquare, CheckCircle, Clock, Shield, Sparkles } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen relative"
      style={{
        backgroundImage: 'url(/images/landing-bg-1.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
      }}
    >
      {/* Overlay for better text readability */}
      <div className="absolute inset-0 bg-white/20"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Navigation */}
        <nav className="px-8 lg:px-12 py-6">
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
        <div className="px-8 lg:px-12 py-20 min-h-[calc(100vh-100px)] flex items-center">
          <div className="max-w-7xl mx-auto w-full">
            <div className="max-w-3xl">
              <h1 className="text-6xl lg:text-8xl font-bold leading-[1.1] font-serif mb-8">
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

              <p className="text-lg lg:text-xl text-gray-700 leading-relaxed max-w-xl mb-10">
                Get instant, AI-powered agricultural guidance from agronomist-trained agents.
                Available 24/7, personalized to your crops and location across Ghana.
              </p>

              <Link
                href="/signup"
                className="inline-flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-900 px-10 py-4 rounded-full transition-all duration-300 font-medium shadow-lg hover:shadow-xl border-2 border-gray-200"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 lg:mb-24 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900">
              Simple. Powerful. <span className="text-[#536d3d]">Effective.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Three steps to transform how agricultural knowledge reaches farmers
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 lg:gap-12">
            {/* Step 1 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#536d3d]/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-16 h-16 bg-[#536d3d] rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-[#85b878]/20">01</span>
                    <h3 className="text-2xl font-bold text-gray-900">Agronomist Trains</h3>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Expert agronomists upload knowledge bases, configure AI agents, and set
                    confidence thresholds for when to escalate to humans.
                  </p>
                  {/* PLACEHOLDER: Illustration of agronomist uploading documents to dashboard */}
                  <div className="mt-6 aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Dashboard illustration</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#85b878]/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-16 h-16 bg-[#85b878] rounded-2xl flex items-center justify-center mb-6">
                  <MessageSquare className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-[#608e96]/20">02</span>
                    <h3 className="text-2xl font-bold text-gray-900">Farmer Asks</h3>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    Farmers chat with AI agents via mobile — asking questions about crops,
                    pests, weather, or planting schedules. Anytime, anywhere.
                  </p>
                  {/* PLACEHOLDER: Mobile chat interface mockup */}
                  <div className="mt-6 aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                    <p className="text-gray-400 text-sm">Chat interface mockup</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 */}
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#608e96]/5 to-transparent rounded-3xl transform group-hover:scale-105 transition-transform duration-300"></div>
              <div className="relative bg-white rounded-3xl p-8 lg:p-10 shadow-sm hover:shadow-xl transition-all duration-300 h-full">
                <div className="w-16 h-16 bg-[#608e96] rounded-2xl flex items-center justify-center mb-6">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-5xl font-bold text-[#e8c8ab]/50">03</span>
                    <h3 className="text-2xl font-bold text-gray-900">Farmer Gets Expert Advice</h3>
                  </div>
                  <p className="text-gray-600 text-lg leading-relaxed">
                    AI delivers instant, personalized guidance based on expert knowledge.
                    Low-confidence queries get flagged for human agronomist review.
                  </p>
                  {/* PLACEHOLDER: Message bubbles showing AI response with sources */}
                  <div className="mt-6 aspect-video bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl flex items-center justify-center">
                    <p className="text-gray-400 text-sm">AI response illustration</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why It Matters Section */}
      <section id="why-cultivate" className="py-20 lg:py-32 px-6 lg:px-12 bg-[#536d3d] text-white relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#85b878] rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#608e96] rounded-full blur-3xl opacity-20"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
                The knowledge gap is real
              </h2>
              <div className="space-y-6 text-lg lg:text-xl text-white/90 leading-relaxed">
                <p>
                  Ghana has <strong className="text-white">only 2,000 agronomists</strong> serving
                  millions of farmers. That's a 1:2,500 ratio — impossible for personal consultations.
                </p>
                <p>
                  Farmers need answers when crops are sick, pests strike, or weather changes.
                  But expert advice isn't available at midnight. Or on weekends. Or in remote areas.
                </p>
                <p>
                  <strong className="text-white">Until now.</strong>
                </p>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#85b878] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">24/7 Availability</h3>
                    <p className="text-white/80 text-lg">
                      No more waiting days for advice. Get instant answers whenever you need them.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#608e96] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Sprout className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Personalized Guidance</h3>
                    <p className="text-white/80 text-lg">
                      Not generic advice — context-aware responses based on your crops, location, and needs.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[#e8c8ab] rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-6 h-6 text-[#536d3d]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold mb-2">Scale Without Limits</h3>
                    <p className="text-white/80 text-lg">
                      One agronomist can now support thousands of farmers simultaneously.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Signals Section */}
      <section id="trust" className="py-20 lg:py-32 px-6 lg:px-12 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 lg:mb-24 space-y-4">
            <h2 className="text-4xl lg:text-6xl font-bold text-gray-900">
              AI guided by <span className="text-[#536d3d]">real experts</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Not just another chatbot. Every response is backed by agricultural expertise.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 mb-16">
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-[#536d3d]/10 rounded-2xl flex items-center justify-center mb-6">
                <Shield className="w-8 h-8 text-[#536d3d]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Trained by Agronomists</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Every AI agent is configured and supervised by certified agricultural experts who
                upload curated knowledge bases.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-[#85b878]/10 rounded-2xl flex items-center justify-center mb-6">
                <Users className="w-8 h-8 text-[#85b878]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Human Escalation</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                When the AI isn't confident, it flags the query for human review. You always get
                verified answers.
              </p>
            </div>
            <div className="bg-white rounded-3xl p-8 lg:p-10 shadow-sm border border-gray-100">
              <div className="w-16 h-16 bg-[#608e96]/10 rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-8 h-8 text-[#608e96]" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Source Citations</h3>
              <p className="text-gray-600 text-lg leading-relaxed">
                Every response includes references to the knowledge base sources, so you know where
                the advice comes from.
              </p>
            </div>
          </div>

          {/* Testimonial placeholder */}
          <div className="bg-gradient-to-br from-[#536d3d] to-[#85b878] rounded-3xl p-12 lg:p-16 text-white">
            <div className="max-w-4xl mx-auto text-center space-y-6">
              {/* PLACEHOLDER: Testimonial from Farmitecture agronomist or early farmer user */}
              <div className="text-4xl lg:text-5xl font-bold leading-tight">
                "Cultivate lets me reach 100x more farmers without sacrificing quality.
                It's like cloning my expertise."
              </div>
              <div className="flex items-center justify-center gap-4 pt-4">
                <div className="w-16 h-16 bg-white/20 rounded-full"></div>
                <div className="text-left">
                  <p className="font-bold text-lg">Dr. Sarah Mensah</p>
                  <p className="text-white/80">Lead Agronomist, Farmitecture</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-20 lg:py-32 px-6 lg:px-12 bg-gray-900 text-white">
        <div className="max-w-5xl mx-auto text-center space-y-8">
          <h2 className="text-4xl lg:text-6xl font-bold leading-tight">
            Ready to transform agricultural extension?
          </h2>
          <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto">
            Join Farmitecture and other forward-thinking organizations scaling expert knowledge
            to every farmer.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/signup"
              className="group bg-[#85b878] text-white px-10 py-5 rounded-full hover:bg-[#536d3d] transition-all duration-300 font-bold text-xl shadow-xl hover:shadow-2xl flex items-center justify-center gap-2"
            >
              Start Your Free Trial
              <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white px-10 py-5 rounded-full hover:bg-white hover:text-gray-900 transition-all duration-300 font-bold text-xl flex items-center justify-center"
            >
              Sign In
            </Link>
          </div>
          <p className="text-gray-400 pt-4">
            No credit card required • Set up in minutes • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sprout className="w-6 h-6 text-[#85b878]" />
                <span className="text-xl font-bold">Cultivate</span>
              </div>
              <p className="text-gray-400">
                Scaling agricultural expertise through AI
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Company</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © 2025 Cultivate by Farmitecture. All rights reserved.
            </p>
            <p className="text-gray-400 text-sm">
              Built at Ashesi University
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
