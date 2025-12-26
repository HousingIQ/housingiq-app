import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MapPin, BarChart3, ArrowRight, Home } from 'lucide-react';

export default async function LandingPage() {
  const session = await auth();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-blue-600" />
            <span className="text-xl font-bold">HousingIQ</span>
          </div>
          <nav>
            {session ? (
              <Button asChild>
                <Link href="/dashboard">
                  Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : (
              <Button asChild>
                <Link href="/login">Sign In</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          Housing Analytics
          <span className="block text-blue-600">Powered by Data</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-gray-600 max-w-2xl mx-auto">
          Explore home values, market trends, and housing analytics across the United States.
          Make informed decisions with comprehensive Zillow data.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          {session ? (
            <Button size="lg" asChild>
              <Link href="/dashboard">
                Open Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <>
              <Button size="lg" asChild>
                <Link href="/login">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#features">Learn More</Link>
              </Button>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">
          What You Get When You Sign In
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <TrendingUp className="h-10 w-10 text-blue-600 mb-2" />
              <CardTitle>Home Value Trends</CardTitle>
              <CardDescription>
                Track Zillow Home Value Index (ZHVI) over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Interactive charts showing home value trends from 2000 to present.
                Filter by state, metro area, city, or zip code.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MapPin className="h-10 w-10 text-green-600 mb-2" />
              <CardTitle>Geographic Coverage</CardTitle>
              <CardDescription>
                75,000+ regions across the United States
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Comprehensive coverage including states, counties, metros,
                cities, neighborhoods, and zip codes.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-purple-600 mb-2" />
              <CardTitle>Compare Regions</CardTitle>
              <CardDescription>
                Side-by-side market comparisons
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Compare home values across multiple regions. Identify market
                trends and investment opportunities.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Preview Section (Blurred for non-logged-in users) */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-4">Dashboard Preview</h2>
        <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
          {session
            ? 'You have full access to all dashboard features.'
            : 'Sign in to unlock full access to all analytics features.'}
        </p>

        <div className="relative">
          <div
            className={`bg-white rounded-xl shadow-xl p-8 ${
              !session ? 'blur-sm' : ''
            }`}
          >
            {/* Mock Dashboard Preview */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              {['$450,000', '+5.2%', '75,292', '25 Years'].map((value, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-sm text-gray-500">
                    {['Median Home Value', 'YoY Growth', 'Regions', 'Data History'][i]}
                  </div>
                </div>
              ))}
            </div>

            {/* Mock Chart */}
            <div className="bg-gray-50 rounded-lg p-6 h-64 flex items-end justify-between">
              {[40, 45, 48, 52, 55, 58, 62, 68, 72, 78, 82, 85].map((h, i) => (
                <div
                  key={i}
                  className="bg-blue-500 rounded-t w-full mx-1"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(
                (m) => (
                  <span key={m}>{m}</span>
                )
              )}
            </div>
          </div>

          {/* Overlay for non-logged-in users */}
          {!session && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-xl">
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 mb-4">
                  Sign in to access the full dashboard
                </p>
                <Button asChild>
                  <Link href="/login">
                    Sign In with Google <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Data Attribution */}
      <section className="bg-gray-50 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            Data sourced from{' '}
            <a
              href="https://www.zillow.com/research/data/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Zillow Research
            </a>
            . Updated monthly with the latest housing market data.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} HousingIQ. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
