import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { evolvePath } from "@remotion/paths";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/GradientBackground";
import { COLORS, CHART_DATA, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
});

// Chart dimensions
const CHART_X = 200;
const CHART_Y = 120;
const CHART_W = 1520;
const CHART_H = 700;
const PADDING_BOTTOM = 80;
const PADDING_TOP = 40;
const PLOT_H = CHART_H - PADDING_BOTTOM - PADDING_TOP;

const MIN_VAL = 150000;
const MAX_VAL = 380000;

function dataToPoints() {
  return CHART_DATA.map((d, i) => {
    const x = CHART_X + (i / (CHART_DATA.length - 1)) * CHART_W;
    const yNorm = (d.value - MIN_VAL) / (MAX_VAL - MIN_VAL);
    const y = CHART_Y + PADDING_TOP + PLOT_H * (1 - yNorm);
    return { x, y };
  });
}

function generatePath(points: { x: number; y: number }[]): string {
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
}

function generateAreaPath(points: { x: number; y: number }[]): string {
  const bottom = CHART_Y + PADDING_TOP + PLOT_H;
  const line = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  return `${line} L ${points[points.length - 1].x} ${bottom} L ${points[0].x} ${bottom} Z`;
}

const D = TRANSITION_DURATION;

export const ChartScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const points = dataToPoints();
  const linePath = generatePath(points);
  const areaPath = generateAreaPath(points);

  const titleOpacity = interpolate(frame, [D, D + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const drawProgress = interpolate(frame, [D + 15, D + 90], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const { strokeDasharray, strokeDashoffset } = evolvePath(
    drawProgress,
    linePath
  );

  const areaOpacity = interpolate(frame, [D + 60, D + 100], [0, 0.15], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const yLabelsOpacity = interpolate(frame, [D + 5, D + 25], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const dotScale = (i: number) => {
    const pointProgress = i / (CHART_DATA.length - 1);
    const pointFrame = D + 15 + pointProgress * 75;
    return spring({
      frame: frame - pointFrame,
      fps,
      config: { damping: 200 },
    });
  };

  // Y-axis tick values
  const yTicks = [150, 200, 250, 300, 350];

  return (
    <AbsoluteFill>
      <GradientBackground />

      <div
        style={{
          position: "absolute",
          top: 40,
          left: 0,
          right: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          fontFamily,
        }}
      >
        <h2
          style={{
            fontSize: 44,
            fontWeight: 700,
            color: COLORS.textWhite,
            opacity: titleOpacity,
            margin: 0,
          }}
        >
          Zillow Home Value Index
        </h2>
        <p
          style={{
            fontSize: 24,
            color: COLORS.textMuted,
            opacity: titleOpacity,
            margin: "8px 0 0",
          }}
        >
          National Median — 2015 to 2024
        </p>
      </div>

      <svg
        width={1920}
        height={1080}
        style={{ position: "absolute", top: 0, left: 0 }}
      >
        {/* Y-axis labels */}
        {yTicks.map((val) => {
          const yNorm = (val * 1000 - MIN_VAL) / (MAX_VAL - MIN_VAL);
          const y = CHART_Y + PADDING_TOP + PLOT_H * (1 - yNorm);
          return (
            <g key={val} opacity={yLabelsOpacity}>
              <text
                x={CHART_X - 20}
                y={y + 5}
                fill={COLORS.textMuted}
                fontSize={22}
                fontFamily={fontFamily}
                textAnchor="end"
              >
                ${val}K
              </text>
              <line
                x1={CHART_X}
                y1={y}
                x2={CHART_X + CHART_W}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={1}
              />
            </g>
          );
        })}

        {/* X-axis labels */}
        {CHART_DATA.map((d, i) => {
          const x =
            CHART_X + (i / (CHART_DATA.length - 1)) * CHART_W;
          const labelOpacity = interpolate(
            frame,
            [D + 20 + i * 5, D + 35 + i * 5],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return (
            <text
              key={d.year}
              x={x}
              y={CHART_Y + PADDING_TOP + PLOT_H + 40}
              fill={COLORS.textMuted}
              fontSize={22}
              fontFamily={fontFamily}
              textAnchor="middle"
              opacity={labelOpacity}
            >
              {d.year}
            </text>
          );
        })}

        {/* Area fill */}
        <path d={areaPath} fill={COLORS.primary} opacity={areaOpacity} />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={COLORS.primary}
          strokeWidth={4}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
        />

        {/* Data points */}
        {points.map((p, i) => {
          const s = dotScale(i);
          return (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={8 * s}
              fill={COLORS.primary}
              stroke="white"
              strokeWidth={3 * s}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
