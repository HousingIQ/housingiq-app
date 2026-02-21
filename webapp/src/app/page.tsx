import Link from 'next/link';
import { auth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, MapPin, BarChart3, ArrowRight, Home, MessageSquare } from 'lucide-react';

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

        {/* Promo Video */}
        <div className="mt-12 max-w-4xl mx-auto rounded-xl shadow-2xl overflow-hidden bg-gray-900">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full aspect-video"
            poster="/video/poster.jpg"
          >
            <source src="/video/promo.mp4" type="video/mp4" />
          </video>
        </div>

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
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                450 popular regions across the United States
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                All 51 states plus 98 metros, 101 counties,
                and 200 cities with full historical data.
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

          <Card>
            <CardHeader>
              <MessageSquare className="h-10 w-10 text-pink-600 mb-2" />
              <CardTitle>AI Chat</CardTitle>
              <CardDescription>
                AI-powered market intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Ask questions about any market and get instant insights
                with interactive charts and data analysis.
              </p>
            </CardContent>
          </Card>
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
