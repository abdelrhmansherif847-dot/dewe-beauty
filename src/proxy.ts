import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Session refresh is only needed where the signed-in user matters.
  matcher: ["/account/:path*", "/checkout/:path*", "/orders/:path*", "/auth/:path*"],
};
