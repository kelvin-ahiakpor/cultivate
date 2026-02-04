import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/signup"];
  const isPublicRoute = publicRoutes.some((route) => pathname === route);

  // If not authenticated and trying to access protected route, redirect to login
  if (!session && !isPublicRoute) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based access control
  if (session?.user) {
    const { role } = session.user;

    // Agronomist routes
    if (pathname.startsWith("/dashboard")) {
      if (role !== "AGRONOMIST" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/chat", req.url));
      }
    }

    // Farmer routes
    if (pathname.startsWith("/chat")) {
      if (role !== "FARMER" && role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Redirect authenticated users from login/signup to their appropriate dashboard
    if (pathname === "/login" || pathname === "/signup") {
      if (role === "AGRONOMIST" || role === "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      } else {
        return NextResponse.redirect(new URL("/chat", req.url));
      }
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|images|.*\\.svg|.*\\.png|.*\\.jpg|.*\\.jpeg|.*\\.gif|.*\\.webp).*)"],
  runtime: "nodejs",
};
