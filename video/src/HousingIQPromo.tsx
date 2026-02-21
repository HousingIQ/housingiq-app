import React from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { IntroScene } from "./scenes/IntroScene";
import { StatsScene } from "./scenes/StatsScene";
import { ChartScene } from "./scenes/ChartScene";
import { AIChatScene } from "./scenes/AIChatScene";
import { MapScene } from "./scenes/MapScene";
import { FeaturesScene } from "./scenes/FeaturesScene";
import { OutroScene } from "./scenes/OutroScene";
import { SCENE_DURATIONS, TRANSITION_DURATION } from "./lib/constants";

const FADE_TIMING = linearTiming({ durationInFrames: TRANSITION_DURATION });

export const HousingIQPromo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.intro}
        >
          <IntroScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.stats}
        >
          <StatsScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.chart}
        >
          <ChartScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.aiChat}
        >
          <AIChatScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.map}
        >
          <MapScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.features}
        >
          <FeaturesScene />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={FADE_TIMING}
        />

        <TransitionSeries.Sequence
          durationInFrames={SCENE_DURATIONS.outro}
        >
          <OutroScene />
        </TransitionSeries.Sequence>
      </TransitionSeries>
    </AbsoluteFill>
  );
};
