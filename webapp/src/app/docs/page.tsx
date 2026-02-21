import { redirect } from "next/navigation";
import { getAllDocs } from "@/lib/docs";

export default function DocsIndexPage() {
  const docs = getAllDocs();
  if (docs.length > 0) {
    redirect(`/docs/${docs[0].slug}`);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Documentation</h1>
      <p className="text-gray-600 mt-2">No documentation pages found.</p>
    </div>
  );
}
