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
import { AnimatedCounter } from "../components/AnimatedCounter";
import { COLORS, STATS, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "800"],
  subsets: ["latin"],
});

const D = TRANSITION_DURATION;

export const StatsScene: React.FC = () => {
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
        {/* Section title */}
        <h2
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: COLORS.textWhite,
            marginBottom: 60,
            opacity: titleOpacity,
            letterSpacing: -1,
          }}
        >
          Comprehensive Coverage
        </h2>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            gap: 50,
            justifyContent: "center",
          }}
        >
          {STATS.map((stat, i) => {
            const cardSpring = spring({
              frame,
              fps,
              delay: D + 10 + i * 8,
              config: { damping: 200 },
            });

            const translateY = interpolate(cardSpring, [0, 1], [60, 0]);
            const cardOpacity = cardSpring;

            return (
              <div
                key={stat.label}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  padding: "50px 40px",
                  borderRadius: 24,
                  background: "rgba(255,255,255,0.05)",
                  border: `1px solid ${stat.color}30`,
                  minWidth: 260,
                  opacity: cardOpacity,
                  transform: `translateY(${translateY}px)`,
                  boxShadow: `0 0 40px ${stat.color}15`,
                }}
              >
                <AnimatedCounter
                  value={stat.value}
                  suffix={"suffix" in stat ? stat.suffix : ""}
                  delay={D + 20 + i * 8}
                  color={stat.color}
                />
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    color: COLORS.textLight,
                    marginTop: 16,
                  }}
                >
                  {stat.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
