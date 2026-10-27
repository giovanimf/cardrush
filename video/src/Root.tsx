import { Composition } from "remotion";
import { Presentation } from "./Presentation";
import { totalFrames } from "./timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="CardRush" component={Presentation} durationInFrames={totalFrames(30)} fps={30} width={1920} height={1080} />
  );
};
