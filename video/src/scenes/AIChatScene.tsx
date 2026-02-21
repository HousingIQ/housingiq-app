import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
  Easing,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { GradientBackground } from "../components/GradientBackground";
import { COLORS, TRANSITION_DURATION } from "../lib/constants";

const { fontFamily } = loadFont("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["latin"],
});

const D = TRANSITION_DURATION;

export const AIChatScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleOpacity = interpolate(frame, [D, D + 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const browserSpring = spring({
    frame,
    fps,
    delay: D + 5,
    config: { damping: 200 },
  });
  const browserScale = interpolate(browserSpring, [0, 1], [0.93, 1]);

  const userMsgProgress = interpolate(frame, [D + 30, D + 48], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  const showTyping = frame >= D + 52 && frame < D + 72;

  const aiTextOpacity = interpolate(frame, [D + 68, D + 82], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const cardSpring = spring({
    frame,
    fps,
    delay: D + 82,
    config: { damping: 200 },
  });
  const cardY = interpolate(cardSpring, [0, 1], [25, 0]);

  const metricProgress = interpolate(frame, [D + 92, D + 130], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const homeValue = Math.round(interpolate(metricProgress, [0, 1], [0, 420644]));

  const chartDraw = interpolate(frame, [D + 105, D + 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

  return (
    <AbsoluteFill>
      <GradientBackground variant="navy" />

      {/* Scene title */}
      <div
        style={{
          position: "absolute",
          top: 32,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
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
          AI-Powered Market Intelligence
        </h2>
      </div>

      {/* Mock browser frame */}
      <div
        style={{
          position: "absolute",
          top: 105,
          left: 140,
          right: 140,
          bottom: 40,
          borderRadius: 16,
          overflow: "hidden",
          background: "#111827",
          border: "1px solid rgba(255,255,255,0.1)",
          transform: `scale(${browserScale})`,
          opacity: browserSpring,
          boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          fontFamily,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Browser top bar */}
        <div
          style={{
            height: 44,
            background: "rgba(255,255,255,0.04)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
          <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#22c55e" }} />
          <div
            style={{
              marginLeft: 16,
              padding: "4px 24px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.06)",
              fontSize: 15,
              color: COLORS.textMuted,
            }}
          >
            housingiq.app/dashboard/chat
          </div>
        </div>

        {/* Chat content area */}
        <div
          style={{
            flex: 1,
            padding: "28px 50px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
            overflowY: "hidden",
          }}
        >
          {/* User message */}
          <div
            style={{
              alignSelf: "flex-end",
              maxWidth: 620,
              padding: "14px 22px",
              borderRadius: "18px 18px 4px 18px",
              background: COLORS.primary,
              color: "white",
              fontSize: 22,
              fontWeight: 500,
              opacity: userMsgProgress,
              transform: `translateX(${interpolate(userMsgProgress, [0, 1], [30, 0])}px)`,
            }}
          >
            Show me the home value price trend for Austin, TX
          </div>

          {/* AI typing indicator */}
          {showTyping && (
            <div
              style={{
                alignSelf: "flex-start",
                display: "flex",
                gap: 6,
                padding: "14px 20px",
                borderRadius: "18px 18px 18px 4px",
                background: "rgba(255,255,255,0.07)",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: COLORS.textMuted,
                    opacity: 0.3 + 0.7 * Math.abs(Math.sin(frame * 0.18 + i * 1.2)),
                  }}
                />
              ))}
            </div>
          )}

          {/* AI response */}
          <div
            style={{
              alignSelf: "flex-start",
              maxWidth: 1100,
              opacity: aiTextOpacity,
            }}
          >
            <p
              style={{
                fontSize: 20,
                color: COLORS.textLight,
                margin: "0 0 18px",
                lineHeight: 1.5,
              }}
            >
              Austin&apos;s home values have declined over the past year, with the
              current ZHVI at $420,644 (down 2.39% year-over-year). The market is
              classified as &ldquo;Cold,&rdquo; reflecting a cooling trend from the
              peak in early 2024.
            </p>

            {/* Generative UI Card */}
            <div
              style={{
                borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: 26,
                opacity: cardSpring,
                transform: `translateY(${cardY}px)`,
              }}
            >
              <h3
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: COLORS.textWhite,
                  margin: "0 0 22px",
                }}
              >
                Austin, TX Metro Area &mdash; Home Value Trend
              </h3>

              {/* Metrics row */}
              <div style={{ display: "flex", gap: 20, marginBottom: 22 }}>
                <MetricBox
                  label="Current Home Value"
                  value={`$${homeValue >= 1000 ? homeValue.toLocaleString("en-US") : homeValue}`}
                  sub="ZHVI · All Homes"
                  color={COLORS.textWhite}
                />
                <MetricBox
                  label="Year-over-Year Change"
                  value={metricProgress > 0.1 ? "\u22122.39%" : ""}
                  sub="12-month trend \u2193"
                  color={COLORS.red}
                />
                <MetricBox
                  label="Month-over-Month Change"
                  value={metricProgress > 0.2 ? "+0.20%" : ""}
                  sub="Latest month \u2191"
                  color={COLORS.green}
                />
              </div>

              {/* Mini chart */}
              <div
                style={{
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.03)",
                  padding: "14px 18px",
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: COLORS.textLight,
                    marginBottom: 10,
                  }}
                >
                  Home Value (ZHVI) &mdash; Last 24 Months
                </div>
                <svg
                  width="100%"
                  height={100}
                  viewBox="0 0 600 80"
                  preserveAspectRatio="none"
                >
                  {[20, 40, 60].map((y) => (
                    <line
                      key={y}
                      x1={0}
                      y1={y}
                      x2={600}
                      y2={y}
                      stroke="rgba(255,255,255,0.04)"
                      strokeWidth={1}
                    />
                  ))}
                  <path
                    d="M0,65 L50,58 L100,52 L150,45 L200,28 L250,16 L300,13 L350,10 L400,13 L450,14 L500,13 L550,12 L600,14"
                    fill="none"
                    stroke={COLORS.primary}
                    strokeWidth={3}
                    strokeLinecap="round"
                    pathLength={1}
                    strokeDasharray={1}
                    strokeDashoffset={1 - chartDraw}
                  />
                  <path
                    d="M0,65 L50,58 L100,52 L150,45 L200,28 L250,16 L300,13 L350,10 L400,13 L450,14 L500,13 L550,12 L600,14 L600,80 L0,80 Z"
                    fill={COLORS.primary}
                    opacity={0.1 * chartDraw}
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const MetricBox: React.FC<{
  label: string;
  value: string;
  sub: string;
  color: string;
}> = ({ label, value, sub, color }) => (
  <div
    style={{
      flex: 1,
      padding: "14px 18px",
      borderRadius: 10,
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
    }}
  >
    <div style={{ fontSize: 13, color: COLORS.textMuted, marginBottom: 5 }}>
      {label}
    </div>
    <div
      style={{
        fontSize: 30,
        fontWeight: 700,
        color,
        fontVariantNumeric: "tabular-nums",
        minHeight: 36,
      }}
    >
      {value}
    </div>
    <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 3 }}>
      {sub}
    </div>
  </div>
);
