import Link from "next/link";
import { Home, BookOpen } from "lucide-react";
import { getAllDocs } from "@/lib/docs";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  const docs = getAllDocs();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b z-50 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-5 w-5 text-blue-600" />
          <span className="text-lg font-bold">HousingIQ</span>
        </Link>
        <span className="mx-3 text-gray-300">|</span>
        <div className="flex items-center gap-1.5 text-gray-600">
          <BookOpen className="h-4 w-4" />
          <span className="font-medium text-sm">Documentation</span>
        </div>
        <div className="ml-auto">
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar */}
        <aside className="fixed top-14 left-0 bottom-0 w-64 bg-white border-r overflow-y-auto hidden md:block">
          <nav className="p-4">
            <ul className="space-y-1">
              {docs.map((doc) => (
                <li key={doc.slug}>
                  <Link
                    href={`/docs/${doc.slug}`}
                    className="block px-3 py-2 text-sm text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    {doc.title}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 md:ml-64 min-h-[calc(100vh-3.5rem)]">
          <div className="max-w-4xl mx-auto px-6 py-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
