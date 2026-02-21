import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/GradientBackground";
import { COLORS, FEATURES, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

// SVG icon paths for each feature
const ICONS: Record<string, React.ReactNode> = {
  "chart-bar": (
    <svg
      width={44}
      height={44}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="12" width="4" height="9" rx="1" />
      <rect x="10" y="7" width="4" height="14" rx="1" />
      <rect x="17" y="3" width="4" height="18" rx="1" />
    </svg>
  ),
  trophy: (
    <svg
      width={44}
      height={44}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 22V8a4 4 0 0 1 8-0v14" />
      <path d="M10 14h4" />
    </svg>
  ),
  calculator: (
    <svg
      width={44}
      height={44}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="8" y1="6" x2="16" y2="6" />
      <line x1="16" y1="14" x2="16" y2="18" />
      <line x1="8" y1="11" x2="8" y2="11.01" />
      <line x1="12" y1="11" x2="12" y2="11.01" />
      <line x1="16" y1="11" x2="16" y2="11.01" />
      <line x1="8" y1="15" x2="8" y2="15.01" />
      <line x1="12" y1="15" x2="12" y2="15.01" />
    </svg>
  ),
  chat: (
    <svg
      width={44}
      height={44}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <circle cx="9" cy="10" r="0.5" fill="currentColor" />
      <circle cx="12" cy="10" r="0.5" fill="currentColor" />
      <circle cx="15" cy="10" r="0.5" fill="currentColor" />
    </svg>
  ),
};

// Slide directions: from-left, from-right, from-top, from-bottom
const DIRECTIONS = [
  { x: -100, y: 0 },
  { x: 100, y: 0 },
  { x: 0, y: -80 },
  { x: 0, y: 80 },
];

const D = TRANSITION_DURATION;

export const FeaturesScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [D, D + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBackground />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily,
          padding: 80,
        }}
      >
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textWhite,
            opacity: titleOpacity,
            margin: 0,
            marginBottom: 60,
            letterSpacing: -1,
          }}
        >
          Powerful Features
        </h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 40,
            justifyContent: "center",
            maxWidth: 1400,
          }}
        >
          {FEATURES.map((feature, i) => {
            const dir = DIRECTIONS[i];
            const cardSpring = spring({
              frame,
              fps,
              delay: D + 15 + i * 10,
              config: { damping: 200 },
            });

            const translateX = interpolate(cardSpring, [0, 1], [dir.x, 0]);
            const translateY = interpolate(cardSpring, [0, 1], [dir.y, 0]);
            const cardOpacity = cardSpring;

            return (
              <div
                key={feature.title}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "50px 40px",
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${feature.color}25`,
                  width: 300,
                  opacity: cardOpacity,
                  transform: `translate(${translateX}px, ${translateY}px)`,
                  boxShadow: `0 0 30px ${feature.color}10`,
                }}
              >
                {/* Icon circle */}
                <div
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 20,
                    background: `${feature.color}15`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: feature.color,
                    marginBottom: 24,
                  }}
                >
                  {ICONS[feature.icon]}
                </div>

                <h3
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: COLORS.textWhite,
                    margin: 0,
                    marginBottom: 10,
                    textAlign: "center",
                    minHeight: 68,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {feature.title}
                </h3>

                <p
                  style={{
                    fontSize: 20,
                    color: COLORS.textMuted,
                    margin: 0,
                    textAlign: "center",
                  }}
                >
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
