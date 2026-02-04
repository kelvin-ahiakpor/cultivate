import Link from "next/link";
import { ArrowRight, Sprout, Users, MessageSquare, User } from "lucide-react";
import Image from "next/image";
import { auth } from "@/auth";

export default async function HomePage() {
  const session = await auth();
  return (
    <>
      {/* First Page - Hero with Lettuce Background */}
      <div
        className="h-screen w-full relative"
        style={{
          backgroundImage: 'url(/images/landing-bg-1.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#F9F3EF'
        }}
      >
        {/* Light overlay for text readability - very subtle */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#F9F3EF]/30 via-transparent to-[#F9F3EF]/20"></div>

        {/* Content */}
        <div className="relative z-10 h-screen flex flex-col">

        {/* Navigation - Top */}
        <nav className="px-8 lg:px-12 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Sprout className="w-8 h-8 text-[#536d3d]" />
            </div>
            <div className="hidden lg:flex items-center gap-10 text-[15px]">
              <a href="/" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Homepage</a>
              <a href="#platform" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Platform</a>
              <a href="#about" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">About Us</a>
              <a href="#careers" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Careers</a>
              <a href="#contact" className="text-gray-800 hover:text-[#536d3d] transition-colors font-medium">Contact Us</a>
            </div>
            <div className="flex items-center gap-3">
              {session ? (
                <>
                  <Link
                    href="/chat"
                    className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white px-8 py-3 rounded-full transition-all duration-300 font-medium shadow-md hover:shadow-lg flex items-center gap-2"
                  >
                    Chat
                    <MessageSquare className="w-4 h-4" />
                  </Link>
                  <div className="relative group">
                    <button className="w-10 h-10 bg-[#536d3d] hover:bg-[#85b878] text-white rounded-full transition-all duration-300 flex items-center justify-center shadow-md">
                      <User className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                      <Link
                        href="/dashboard"
                        className="block px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-t-lg transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        href="/profile"
                        className="block px-4 py-3 text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Profile Settings
                      </Link>
                      <form action={async () => {
                        "use server";
                        const { signOut } = await import("@/auth");
                        await signOut();
                      }}>
                        <button
                          type="submit"
                          className="w-full text-left px-4 py-3 text-gray-700 hover:bg-gray-100 rounded-b-lg transition-colors"
                        >
                          Sign Out
                        </button>
                      </form>
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </nav>

        {/* Hero Content - Bottom Right */}
        <div className="flex-1 flex items-end justify-end px-8 lg:px-16 pb-8 lg:pb-12">
          <div className="max-w-2xl text-right">
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

            <p className="text-lg lg:text-xl text-gray-800 leading-relaxed mb-10">
              AI-powered agricultural guidance from agronomist-trained agents.
              Available 24/7, personalized to your crops and location.
            </p>

          </div>
        </div>

        </div>
      </div>

      {/* Second Page - Benefits Section */}
      <section
        className="h-screen relative"
        style={{
          backgroundImage: 'url(/images/landing-bg-2.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#F9F3EF'
        }}
      >
        {/* Light overlay */}
        <div className="absolute inset-0 bg-[#F9F3EF]/20"></div>

        {/* Content */}
        <div className="relative z-10 h-screen py-12 px-8 lg:px-16">
          <div className="max-w-7xl mx-auto w-full h-full">

            {/* Title */}
            <div className="text-center mb-16 pt-4">
              <div className="space-y-2">
                <h3 className="text-3xl lg:text-4xl font-bold text-[#01605E] uppercase tracking-wide">
                  Why Use
                </h3>
                <h2 className="text-6xl lg:text-7xl font-black text-[#c89960] tracking-wider font-serif">
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
                  <p className="text-xl font-bold text-[#01605E] leading-relaxed text-right">
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
                  <p className="text-xl font-bold text-[#01605E] leading-relaxed text-left">
                    Speak to AI Agents configured by Farmitecture's certified agronomists.
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
                  <p className="text-xl font-bold text-[#01605E] leading-relaxed text-right">
                    Advice Tailord to your crops, location and farming stlye
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
                  <p className="text-xl font-bold text-[#01605E] leading-relaxed text-left">
                    Flag queries for human review when AI isn't confident
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>
    </>
  );
}
