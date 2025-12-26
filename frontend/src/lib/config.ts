// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

// Database configuration  
export const DATABASE_URL = process.env.DATABASE_URL || "";

// Feature flags
export const FEATURES = {
    enableAIChat: process.env.NEXT_PUBLIC_ENABLE_AI_CHAT === "true",
} as const;

// App metadata
export const APP_CONFIG = {
    name: "HousingIQ",
    description: "AI-Powered Real Estate Intelligence Platform",
    region: "USA",
} as const;
