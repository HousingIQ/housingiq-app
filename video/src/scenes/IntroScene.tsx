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
import { COLORS } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "700", "800"],
  subsets: ["latin"],
});

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Logo + title spring in
  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 200 },
  });

  const titleScale = interpolate(titleSpring, [0, 1], [0.6, 1]);
  const titleOpacity = titleSpring;

  // Tagline fades in after title
  const taglineOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const taglineY = interpolate(frame, [20, 45], [20, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Subtle glow behind logo
  const glowOpacity = interpolate(frame, [0, 40], [0, 0.6], {
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
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${COLORS.primary}40 0%, transparent 70%)`,
          opacity: glowOpacity,
        }}
      />

      {/* Logo + Title */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          fontFamily,
          transform: `scale(${titleScale})`,
          opacity: titleOpacity,
        }}
      >
        {/* Logo icon */}
        <div
          style={{
            width: 100,
            height: 100,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryLight})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 30,
            boxShadow: `0 20px 60px ${COLORS.primary}60`,
          }}
        >
          <svg
            width={60}
            height={60}
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

        {/* Title */}
        <h1
          style={{
            fontSize: 96,
            fontWeight: 800,
            color: COLORS.textWhite,
            margin: 0,
            letterSpacing: -2,
          }}
        >
          Housing
          <span style={{ color: COLORS.primary }}>IQ</span>
        </h1>

        {/* Tagline */}
        <p
          style={{
            fontSize: 36,
            fontWeight: 400,
            color: COLORS.textMuted,
            margin: 0,
            marginTop: 16,
            opacity: taglineOpacity,
            transform: `translateY(${taglineY}px)`,
            letterSpacing: 2,
          }}
        >
          Housing Analytics Powered by Data
        </p>
      </div>
    </AbsoluteFill>
  );
};
