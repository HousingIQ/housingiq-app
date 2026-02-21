export const COLORS = {
  primary: "#2563eb",
  primaryLight: "#3b82f6",
  green: "#16a34a",
  greenLight: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  pink: "#ec4899",
  orange: "#f97316",
  bgDark: "#0f172a",
  bgDarkBlue: "#1e293b",
  bgNavy: "#0c1222",
  textWhite: "#f8fafc",
  textMuted: "#94a3b8",
  textLight: "#cbd5e1",
} as const;

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

// Scene durations in frames (increased to ensure animations complete
// and content is visible before fade transitions begin)
export const SCENE_DURATIONS = {
  intro: 120, // 4s
  stats: 150, // 5s
  chart: 180, // 6s
  aiChat: 180, // 6s
  map: 150, // 5s
  features: 165, // 5.5s
  outro: 150, // 5s
} as const;

export const TRANSITION_DURATION = 15; // 0.5s fade between scenes

// 7 scenes, 6 transitions: 1095 - 90 = 1005 frames ≈ 33.5s
export const TOTAL_DURATION =
  Object.values(SCENE_DURATIONS).reduce((a, b) => a + b, 0) -
  6 * TRANSITION_DURATION;

export const STATS = [
  { label: "States", value: 51, color: COLORS.primary },
  { label: "Metros", value: 98, color: COLORS.green },
  { label: "Counties", value: 101, color: COLORS.orange },
  { label: "Cities", value: 200, color: COLORS.pink },
] as const;

// Sample ZHVI trend data (representative of national median)
export const CHART_DATA = [
  { year: "2015", value: 178000 },
  { year: "2016", value: 189000 },
  { year: "2017", value: 203000 },
  { year: "2018", value: 218000 },
  { year: "2019", value: 228000 },
  { year: "2020", value: 252000 },
  { year: "2021", value: 305000 },
  { year: "2022", value: 355000 },
  { year: "2023", value: 345000 },
  { year: "2024", value: 358000 },
] as const;

export const FEATURES = [
  {
    icon: "chart-bar",
    title: "Compare Markets",
    description: "Side-by-side metro analysis",
    color: COLORS.primary,
  },
  {
    icon: "trophy",
    title: "Rankings",
    description: "Top performing regions",
    color: COLORS.green,
  },
  {
    icon: "calculator",
    title: "Investment Calculator",
    description: "ROI & appreciation forecast",
    color: COLORS.amber,
  },
  {
    icon: "chat",
    title: "AI Chat",
    description: "Ask questions about any market",
    color: COLORS.pink,
  },
] as const;
