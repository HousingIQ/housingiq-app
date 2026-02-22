import type { Spec } from "@json-render/core";
import { renderToBuffer } from "@json-render/react-pdf/render";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const {
    spec,
    download = false,
    filename = "document.pdf",
  }: { spec: Spec; download?: boolean; filename?: string } =
    await request.json();

  if (!spec) {
    return new Response(JSON.stringify({ error: "Missing spec" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const buffer = await renderToBuffer(spec);

  const disposition = download
    ? `attachment; filename="${filename}"`
    : `inline; filename="${filename}"`;

  return new Response(Buffer.from(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": disposition,
    },
  });
}
