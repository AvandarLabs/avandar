import { AbsoluteFill, Composition, Sequence, useCurrentFrame } from "remotion";
import "./theme.css";
import libraryPlan from "../storyboards/library.json";
import { Demo, DEMO_LEN } from "./compositions/Demo/Demo";
import { MotionLab, MOTION_LAB_LEN } from "./compositions/MotionLab";
import { TitleStudy, TITLE_STUDY_LEN } from "./compositions/TitleStudy";
import { StockCompositions } from "./stock/StockCompositions";
import { storyboardSchema, durationInFrames } from "./storyboard/schema/schema";
import { StoryFilm } from "./storyboard/StoryFilm/StoryFilm";
import { TITLE_LEN, TitleCard } from "./title-card";

export const FPS = 30;

/* 1600x1000 is 8:5, a wide tile, the shape a demo takes when it sits in a
 * page section rather than in a video player. For docs, a social post or an
 * app store listing you probably want 16:9 (1600x900) or 1:1; change these
 * two numbers and the scale filter in scripts/render.sh together.
 *
 * Whatever you pick, deliver on a 16-aligned size: 1000 % 16 = 8, which
 * costs a partial macroblock row on every frame for nothing. This canvas
 * ships at 1536x960, same aspect, both dimensions clean. */
export const WIDTH = 1600;
export const HEIGHT = 1000;

/**
 * Title card, then the flow.
 *
 * The body is wrapped in a Sequence rather than retimed. Every click beat
 * and pointer keyframe inside a composition is an absolute frame number,
 * and shifting sixty of them by hand is how a cursor ends up clicking six
 * frames after the button it was aiming at. Inside the Sequence the body
 * still sees its own frame 0 where it always did, so none of those frame
 * numbers need to shift.
 *
 * Both layers sit on the same dark ground, so the handover is a dissolve
 * between two states of one field rather than a cut between two lit frames,
 * and the last frame matches frame 0, which is what keeps the loop seam
 * from strobing every time the tile repeats.
 */
function Clip({
  body,
  name,
  kicker,
}: {
  body: React.ReactNode;
  name: string;
  kicker: string;
}) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "var(--ground)" }}>
      {frame < TITLE_LEN ? (
        <TitleCard name={name} kicker={kicker} frame={frame} />
      ) : null}
      <Sequence from={TITLE_LEN}>{body}</Sequence>
    </AbsoluteFill>
  );
}

export function RemotionRoot() {
  return (
    <>
      <StockCompositions />
      <Composition
        id="story-film"
        component={StoryFilm}
        defaultProps={{ plan: storyboardSchema.parse(libraryPlan) }}
        calculateMetadata={({ props }) => {
          const plan = storyboardSchema.parse(props.plan);
          return {
            props: { plan },
            durationInFrames: durationInFrames(plan),
            fps: plan.fps,
            width: plan.width,
            height: plan.height,
          };
        }}
        durationInFrames={durationInFrames(storyboardSchema.parse(libraryPlan))}
        fps={30}
        width={1600}
        height={1000}
      />
      <Composition
        id="demo"
        component={() => (
          <Clip
            body={<Demo />}
            name="Acme Studio"
            kicker="Ask a question, publish the answer"
          />
        )}
        durationInFrames={DEMO_LEN + TITLE_LEN}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="title-study"
        component={TitleStudy}
        durationInFrames={TITLE_STUDY_LEN}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="motion-lab"
        component={() => (
          <Clip
            body={<MotionLab />}
            name="Motion vocabulary"
            kicker="Four building blocks, one visual language"
          />
        )}
        durationInFrames={MOTION_LAB_LEN + TITLE_LEN}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
}
