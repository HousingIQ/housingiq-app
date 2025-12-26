// Mock data for HousingIQ dashboard

export interface MarketData {
    city: string;
    state: string;
    growth: number;
    risk: "Low" | "Medium" | "High";
    medianPrice: number;
    inventory: number;
    daysOnMarket: number;
}

export interface MacroIndicator {
    name: string;
    value: number;
    unit: string;
    change: number;
    trend: "up" | "down" | "stable";
}

export interface Alert {
    id: string;
    type: "warning" | "info" | "success" | "danger";
    title: string;
    message: string;
    timestamp: string;
    region?: string;
}

export interface DashboardData {
    healthScore: number;
    healthScoreTrend: number;
    priceGrowth: number;
    priceGrowthTrend: number;
    inventoryLevel: "Very Low" | "Low" | "Normal" | "High" | "Very High";
    inventoryChange: number;
    mortgageRate: number;
    mortgageRateTrend: number;
    topMarkets: MarketData[];
    macroIndicators: MacroIndicator[];
    alerts: Alert[];
    priceTrends: {
        month: string;
        national: number;
        forecast: number | null;
    }[];
}

export const dashboardData: DashboardData = {
    healthScore: 72,
    healthScoreTrend: 3.2,
    priceGrowth: 5.2,
    priceGrowthTrend: -1.8,
    inventoryLevel: "Low",
    inventoryChange: 12.5,
    mortgageRate: 6.89,
    mortgageRateTrend: 0.15,

    topMarkets: [
        {
            city: "Austin",
            state: "TX",
            growth: 8.3,
            risk: "Medium",
            medianPrice: 542000,
            inventory: 2450,
            daysOnMarket: 28,
        },
        {
            city: "Phoenix",
            state: "AZ",
            growth: 6.1,
            risk: "Low",
            medianPrice: 438000,
            inventory: 4200,
            daysOnMarket: 35,
        },
        {
            city: "Tampa",
            state: "FL",
            growth: 7.8,
            risk: "Medium",
            medianPrice: 385000,
            inventory: 3100,
            daysOnMarket: 32,
        },
        {
            city: "Nashville",
            state: "TN",
            growth: 5.9,
            risk: "Low",
            medianPrice: 465000,
            inventory: 2800,
            daysOnMarket: 30,
        },
        {
            city: "Denver",
            state: "CO",
            growth: 4.2,
            risk: "Low",
            medianPrice: 595000,
            inventory: 3500,
            daysOnMarket: 38,
        },
        {
            city: "Miami",
            state: "FL",
            growth: 9.1,
            risk: "High",
            medianPrice: 625000,
            inventory: 2100,
            daysOnMarket: 25,
        },
    ],

    macroIndicators: [
        {
            name: "Fed Funds Rate",
            value: 5.25,
            unit: "%",
            change: 0,
            trend: "stable",
        },
        {
            name: "CPI (Inflation)",
            value: 3.2,
            unit: "%",
            change: -0.3,
            trend: "down",
        },
        {
            name: "Unemployment",
            value: 3.9,
            unit: "%",
            change: 0.1,
            trend: "up",
        },
        {
            name: "GDP Growth",
            value: 2.8,
            unit: "%",
            change: 0.4,
            trend: "up",
        },
        {
            name: "10Y Treasury",
            value: 4.35,
            unit: "%",
            change: -0.12,
            trend: "down",
        },
        {
            name: "Consumer Confidence",
            value: 102.5,
            unit: "",
            change: 3.2,
            trend: "up",
        },
    ],

    alerts: [
        {
            id: "1",
            type: "warning",
            title: "Overvaluation Signal",
            message:
                "Austin market showing overvaluation signals. Price-to-income ratio exceeds historical average by 18%.",
            timestamp: "2 hours ago",
            region: "Austin, TX",
        },
        {
            id: "2",
            type: "info",
            title: "Rate Sensitivity Alert",
            message:
                "Miami market highly sensitive to rate changes. A 0.5% rate increase could reduce affordability by 8%.",
            timestamp: "5 hours ago",
            region: "Miami, FL",
        },
        {
            id: "3",
            type: "success",
            title: "Market Recovery",
            message:
                "Phoenix inventory levels normalizing. Days on market decreased 12% month-over-month.",
            timestamp: "1 day ago",
            region: "Phoenix, AZ",
        },
        {
            id: "4",
            type: "danger",
            title: "Price Correction Risk",
            message:
                "Boise showing early signs of price correction. Year-over-year growth turned negative.",
            timestamp: "1 day ago",
            region: "Boise, ID",
        },
    ],

    priceTrends: [
        { month: "Jan", national: 385000, forecast: null },
        { month: "Feb", national: 388000, forecast: null },
        { month: "Mar", national: 392000, forecast: null },
        { month: "Apr", national: 398000, forecast: null },
        { month: "May", national: 405000, forecast: null },
        { month: "Jun", national: 412000, forecast: null },
        { month: "Jul", national: 418000, forecast: null },
        { month: "Aug", national: 422000, forecast: null },
        { month: "Sep", national: 425000, forecast: null },
        { month: "Oct", national: 428000, forecast: null },
        { month: "Nov", national: 430000, forecast: null },
        { month: "Dec", national: 432000, forecast: null },
        { month: "Jan*", national: 432000, forecast: 435000 },
        { month: "Feb*", national: 432000, forecast: 438000 },
        { month: "Mar*", national: 432000, forecast: 442000 },
    ],
};

// Features for landing page
export const features = [
    {
        title: "Interactive Dashboards",
        description:
            "Real-time market overviews with customizable views. Track prices, inventory, and macro indicators at a glance.",
        icon: "LayoutDashboard",
    },
    {
        title: "Predictive Models",
        description:
            "ML-powered forecasts for housing prices. Get 3-12 month predictions with confidence intervals.",
        icon: "TrendingUp",
    },
    {
        title: "AI Insights",
        description:
            "Ask questions in natural language. Our AI explains market dynamics and provides data-backed answers.",
        icon: "Brain",
    },
    {
        title: "Smart Alerts",
        description:
            "Get notified about market shifts, risk signals, and opportunities before they become obvious.",
        icon: "Bell",
    },
];

// Stats for landing page
export const heroStats = [
    { label: "Markets Tracked", value: "400+" },
    { label: "Data Points", value: "10M+" },
    { label: "Forecast Accuracy", value: "94%" },
    { label: "Active Users", value: "5,000+" },
];

// Pricing tiers
export const pricingTiers = [
    {
        name: "Free",
        price: 0,
        description: "Get started with basic market insights",
        features: [
            "National-level data",
            "Basic market overview",
            "Monthly data updates",
            "Limited historical data",
        ],
        cta: "Get Started",
        highlighted: false,
    },
    {
        name: "Pro",
        price: 49,
        description: "Advanced analytics for serious investors",
        features: [
            "City-level forecasts",
            "AI-powered insights",
            "Real-time alerts",
            "Full historical data",
            "Custom scenarios",
            "Priority support",
        ],
        cta: "Start Free Trial",
        highlighted: true,
    },
    {
        name: "Enterprise",
        price: null,
        description: "Custom solutions for organizations",
        features: [
            "API access",
            "Custom models",
            "White-label dashboards",
            "Dedicated support",
            "SLA guarantee",
            "Custom integrations",
        ],
        cta: "Contact Sales",
        highlighted: false,
    },
];
