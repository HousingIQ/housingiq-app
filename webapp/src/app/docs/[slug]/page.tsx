import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import remarkGfm from "remark-gfm";
import { getAllDocs, getDocBySlug } from "@/lib/docs";
import { mdxComponents } from "@/components/docs/mdx-components";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllDocs().map((doc) => ({ slug: doc.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) return { title: "Not Found" };
  return { title: `${doc.title} - HousingIQ Docs` };
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);
  if (!doc) notFound();

  const allDocs = getAllDocs();
  const currentIndex = allDocs.findIndex((d) => d.slug === slug);
  const prev = currentIndex > 0 ? allDocs[currentIndex - 1] : null;
  const next = currentIndex < allDocs.length - 1 ? allDocs[currentIndex + 1] : null;

  return (
    <>
      <article className="prose prose-gray max-w-none">
        <MDXRemote
          source={doc.content}
          options={{ mdxOptions: { format: "md", remarkPlugins: [remarkGfm] } }}
          components={mdxComponents}
        />
      </article>

      {/* Prev / Next navigation */}
      <nav className="mt-12 pt-6 border-t flex justify-between">
        {prev ? (
          <Link
            href={`/docs/${prev.slug}`}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            <ChevronLeft className="h-4 w-4" />
            {prev.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/docs/${next.slug}`}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
          >
            {next.title}
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </>
  );
}
