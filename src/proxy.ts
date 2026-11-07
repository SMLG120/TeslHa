import { NextResponse, type NextRequest } from "next/server";
import { VEHICLE_IDS } from "@/data/vehicles";

const KNOWN = new Set<string>(VEHICLE_IDS);

/**
 * With Cache Components, a never-seen dynamic param is rendered on demand and starts
 * streaming (HTTP 200) before `notFound()` runs. Rejecting unknown vehicle slugs here,
 * before rendering, guarantees a real 404 status on the very first request.
 */
export function proxy(request: NextRequest) {
  const [, section, slug] = request.nextUrl.pathname.split("/");
  if (slug && !KNOWN.has(slug)) {
    return NextResponse.rewrite(new URL(`/__unknown/${section}`, request.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/vehicles/:model", "/studio/:model"] };
