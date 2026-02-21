import fs from "fs";
import path from "path";
import matter from "gray-matter";

const docsDirectory = path.join(process.cwd(), "src/content/docs");

export interface DocMeta {
  slug: string;
  title: string;
  order: number;
}

export interface Doc extends DocMeta {
  content: string;
}

function extractTitle(content: string, filename: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  if (match) return match[1].trim();
  // Fallback: derive from filename
  return filename
    .replace(/^\d+-/, "")
    .replace(/\.md$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getAllDocs(): DocMeta[] {
  const files = fs
    .readdirSync(docsDirectory)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return files.map((filename) => {
    const filePath = path.join(docsDirectory, filename);
    const raw = fs.readFileSync(filePath, "utf-8");
    const { content } = matter(raw);
    const orderMatch = filename.match(/^(\d+)-/);
    const order = orderMatch ? parseInt(orderMatch[1], 10) : 99;
    const slug = filename.replace(/\.md$/, "");

    return {
      slug,
      title: extractTitle(content, filename),
      order,
    };
  });
}

export function getDocBySlug(slug: string): Doc | null {
  const filename = `${slug}.md`;
  const filePath = path.join(docsDirectory, filename);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { content } = matter(raw);
  const orderMatch = slug.match(/^(\d+)-/);
  const order = orderMatch ? parseInt(orderMatch[1], 10) : 99;

  return {
    slug,
    title: extractTitle(content, filename),
    order,
    content,
  };
}
