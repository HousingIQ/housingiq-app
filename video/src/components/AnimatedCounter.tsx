import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";

export const AnimatedCounter: React.FC<{
  value: number;
  suffix?: string;
  delay?: number;
  color: string;
}> = ({ value, suffix = "", delay = 0, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame,
    fps,
    delay,
    config: { damping: 200 },
    durationInFrames: 60,
  });

  const displayValue = Math.round(interpolate(progress, [0, 1], [0, value]));

  const formatted =
    displayValue >= 1000
      ? displayValue.toLocaleString("en-US")
      : String(displayValue);

  return (
    <span
      style={{
        fontVariantNumeric: "tabular-nums",
        color,
        fontSize: 72,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      {formatted}
      {suffix}
    </span>
  );
};
