import Link from "next/link";
import type { MDXComponents } from "mdx/types";
import { Mermaid } from "./mermaid";

function rewriteDocHref(href: string): string {
  // Rewrite relative .md links like ./07-setup-guide.md → /docs/07-setup-guide
  if (href.startsWith("./") && href.endsWith(".md")) {
    return `/docs/${href.slice(2, -3)}`;
  }
  return href;
}

export const mdxComponents: MDXComponents = {
  a: ({ href, children }) => {
    if (!href) return <a>{children}</a>;
    const rewritten = rewriteDocHref(href);
    if (rewritten.startsWith("/")) {
      return <Link href={rewritten}>{children}</Link>;
    }
    return <a href={rewritten}>{children}</a>;
  },
  pre: ({ children, className }) => {
    const child = children as React.ReactElement<{
      className?: string;
      children?: string;
    }>;

    if (
      child?.props?.className === "language-mermaid" &&
      typeof child.props.children === "string"
    ) {
      return <Mermaid chart={child.props.children} />;
    }

    return <pre className={className}>{children}</pre>;
  },
};
