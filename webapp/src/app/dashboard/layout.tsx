import Link from 'next/link';
import Image from 'next/image';
import { auth, signOut } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, TrendingUp, BarChart3, LogOut, Trophy, Calculator, Map, Sparkles } from 'lucide-react';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white border-r hidden md:block">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <Home className="h-6 w-6 text-blue-600" />
              <span className="text-xl font-bold">HousingIQ</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <TrendingUp className="h-5 w-5" />
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/chat"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Chat
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/compare"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <BarChart3 className="h-5 w-5" />
                  Compare
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/rankings"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Trophy className="h-5 w-5" />
                  Rankings
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/calculator"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Calculator className="h-5 w-5" />
                  Calculator
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard/map"
                  className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Map className="h-5 w-5" />
                  Map
                </Link>
              </li>
            </ul>
          </nav>

          {/* User Section */}
          <div className="p-4 border-t">
            <div className="flex items-center gap-3 mb-3">
              {session.user?.image ? (
                <Image
                  src={session.user.image}
                  alt={session.user.name || 'User'}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-600 font-medium">
                    {session.user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {session.user?.email}
                </p>
              </div>
            </div>
            <form
              action={async () => {
                'use server';
                await signOut({ redirectTo: '/' });
              }}
            >
              <Button variant="ghost" className="w-full justify-start" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b z-50 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2">
          <Home className="h-6 w-6 text-blue-600" />
          <span className="text-xl font-bold">HousingIQ</span>
        </Link>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 min-h-screen">
        <div className="pt-16 md:pt-0">
          {children}
        </div>
      </main>
    </div>
  );
}
