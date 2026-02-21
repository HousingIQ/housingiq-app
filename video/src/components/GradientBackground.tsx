import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { COLORS } from "../lib/constants";

export const GradientBackground: React.FC<{
  variant?: "dark" | "navy";
}> = ({ variant = "dark" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle animated gradient shift
  const gradientAngle = interpolate(frame, [0, 10 * fps], [135, 145], {
    extrapolateRight: "clamp",
  });

  const bg1 = variant === "dark" ? COLORS.bgDark : COLORS.bgNavy;
  const bg2 = variant === "dark" ? COLORS.bgDarkBlue : COLORS.bgDark;

  return (
    <AbsoluteFill>
      <div
        style={{
          width: "100%",
          height: "100%",
          background: `linear-gradient(${gradientAngle}deg, ${bg1} 0%, ${bg2} 50%, ${bg1} 100%)`,
        }}
      />
      {/* Subtle grid overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
        }}
      />
    </AbsoluteFill>
  );
};
