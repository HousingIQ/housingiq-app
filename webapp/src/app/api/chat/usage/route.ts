import { auth } from "@/lib/auth";
import { chatRatelimit } from "@/lib/ai/ratelimit";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { remaining, reset, limit } = await chatRatelimit.getRemaining(
    session.user.id,
  );

  return Response.json({
    remaining,
    limit,
    resetAt: reset,
  });
}
