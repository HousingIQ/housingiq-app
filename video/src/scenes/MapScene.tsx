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
import { USMap } from "../components/USMap";
import { COLORS, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

const D = TRANSITION_DURATION;

const LEGEND_ITEMS = [
  { label: "Hot Market", color: COLORS.red },
  { label: "Warm Market", color: COLORS.amber },
  { label: "Cool Market", color: COLORS.primary },
];

export const MapScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [D, D + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const mapScale = spring({
    frame,
    fps,
    delay: D + 5,
    config: { damping: 200 },
  });

  const legendOpacity = interpolate(frame, [D + 50, D + 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBackground variant="navy" />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily,
        }}
      >
        {/* Title */}
        <h2
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: COLORS.textWhite,
            opacity: titleOpacity,
            margin: 0,
            marginBottom: 20,
            letterSpacing: -1,
          }}
        >
          Nationwide Market Intelligence
        </h2>

        {/* Map container */}
        <div
          style={{
            transform: `scale(${interpolate(mapScale, [0, 1], [0.9, 1])})`,
            opacity: mapScale,
          }}
        >
          <USMap />
        </div>

        {/* Legend */}
        <div
          style={{
            display: "flex",
            gap: 40,
            marginTop: 30,
            opacity: legendOpacity,
          }}
        >
          {LEGEND_ITEMS.map((item) => (
            <div
              key={item.label}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: item.color,
                  opacity: 0.85,
                }}
              />
              <span
                style={{
                  fontSize: 22,
                  color: COLORS.textLight,
                  fontWeight: 400,
                }}
              >
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
