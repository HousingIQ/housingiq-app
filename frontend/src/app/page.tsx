import Link from "next/link";
import { ArrowRight, BarChart3, Brain, Bell, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { heroStats, features } from "@/lib/mock-data";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-white">HousingIQ</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link href="/dashboard" className="text-sm text-slate-400 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="#features" className="text-sm text-slate-400 hover:text-white transition-colors">
                Features
              </Link>
              <Link href="#pricing" className="text-sm text-slate-400 hover:text-white transition-colors">
                Pricing
              </Link>
              <Button size="sm" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
                Sign In
              </Button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-32">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/50 px-4 py-1.5 text-sm text-slate-400 mb-6">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            Real-time market intelligence
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white max-w-4xl mx-auto leading-tight mb-6">
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Real Estate Intelligence
            </span>{" "}
            Platform
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Transform raw housing and macroeconomic data into actionable intelligence. 
            Make data-driven decisions with predictive models and AI insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/dashboard">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
                View Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto">
            {heroStats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-4">
              Everything you need for housing intelligence
            </h2>
            <p className="text-slate-400 max-w-2xl mx-auto">
              From real-time dashboards to AI-powered insights, get the complete toolkit for data-driven real estate decisions.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const IconMap = {
                LayoutDashboard: BarChart3,
                TrendingUp: TrendingUp,
                Brain: Brain,
                Bell: Bell,
              };
              const Icon = IconMap[feature.icon as keyof typeof IconMap] || BarChart3;
              
              return (
                <Card key={feature.title} className="bg-slate-800/50 border-slate-700">
                  <CardContent className="p-6">
                    <div className="h-12 w-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center mb-4">
                      <Icon className="h-6 w-6 text-cyan-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                    <p className="text-sm text-slate-400">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 border-t border-slate-800">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your real estate analysis?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto">
            Start with our free tier and upgrade as you grow. No credit card required.
          </p>
          <Link href="/dashboard">
            <Button size="lg" className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white">
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-white">HousingIQ</span>
            </div>
            <p className="text-sm text-slate-500">
              © 2024 HousingIQ. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
