import React from "react";
import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { US_STATES } from "../lib/us-states";
import { COLORS, TRANSITION_DURATION } from "../lib/constants";

const TEMP_COLORS = {
  hot: COLORS.red,
  warm: COLORS.amber,
  cold: COLORS.primary,
} as const;

const D = TRANSITION_DURATION;

export const USMap: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <svg viewBox="0 0 960 600" width={1200} height={750}>
      {US_STATES.map((state, i) => {
        const stagger = Math.floor(i / 3) * 2;
        const fillProgress = spring({
          frame,
          fps,
          delay: D + 10 + stagger,
          config: { damping: 200 },
        });

        const fillColor = TEMP_COLORS[state.temperature];
        const opacity = interpolate(fillProgress, [0, 1], [0, 0.85]);

        return (
          <path
            key={state.id}
            d={state.path}
            fill={fillColor}
            fillOpacity={opacity}
            stroke="rgba(255,255,255,0.3)"
            strokeWidth={1}
          />
        );
      })}
    </svg>
  );
};
