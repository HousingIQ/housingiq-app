import React from "react";
import { Composition } from "remotion";
import { HousingIQPromo } from "./HousingIQPromo";
import { FPS, WIDTH, HEIGHT, TOTAL_DURATION } from "./lib/constants";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="HousingIQPromo"
      component={HousingIQPromo}
      durationInFrames={TOTAL_DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
