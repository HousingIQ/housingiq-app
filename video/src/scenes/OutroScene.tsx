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
import { COLORS, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin"],
});

const D = TRANSITION_DURATION;

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const ctaSpring = spring({
    frame,
    fps,
    delay: D + 5,
    config: { damping: 200 },
  });

  const ctaScale = interpolate(ctaSpring, [0, 1], [0.7, 1]);
  const ctaOpacity = ctaSpring;

  const urlOpacity = interpolate(frame, [D + 18, D + 32], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const glowOpacity = interpolate(frame, [D, D + 40], [0, 0.5], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <GradientBackground variant="navy" />

      {/* Center glow */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 700,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}30 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily,
        }}
      >
        {/* CTA */}
        <h1
          style={{
            fontSize: 80,
            fontWeight: 800,
            color: COLORS.textWhite,
            margin: 0,
            letterSpacing: -2,
            transform: `scale(${ctaScale})`,
            opacity: ctaOpacity,
          }}
        >
          Start Analyzing Today
        </h1>

        {/* Branding */}
        <div
          style={{
            marginTop: 40,
            opacity: urlOpacity,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            </div>
            <span
              style={{
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.textWhite,
              }}
            >
              Housing<span style={{ color: COLORS.primary }}>IQ</span>
            </span>
          </div>

          <p
            style={{
              fontSize: 24,
              color: COLORS.textMuted,
              margin: 0,
            }}
          >
            housingiq.app
          </p>
        </div>
      </div>
    </AbsoluteFill>
  );
};
