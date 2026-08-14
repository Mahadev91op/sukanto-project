import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    // Staff restrictions for Purchase and Reports
    if (token?.role !== "admin" && (path.startsWith("/purchase") || path.startsWith("/reports") || path === "/")) {
      return NextResponse.redirect(new URL("/sell", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login", 
    },
  }
);

// Ab API routes ko bhi protect kiya gaya hai
export const config = {
  matcher: [
    "/",
    "/purchase/:path*",
    "/sell/:path*",
    "/reports/:path*",
    "/api/sell/:path*",     // Sale API Protected
    "/api/medicine/:path*"  // Medicine API Protected
  ],
};
