import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  // Simple pass-through middleware - auth is handled in each API route
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
