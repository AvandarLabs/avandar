import css from "./AtlasCollectionIntro.module.css";
import type { ReactNode } from "react";

type Props = { eyebrow: string; title: ReactNode; description: string };
/** Introduces the collection shown by AtlasCollection. */
export function AtlasCollectionIntro({
  eyebrow,
  title,
  description,
}: Readonly<Props>): ReactNode {
  return (
    <section
      className={css.atlasCollectionIntroLibraryIntro}
      aria-labelledby="page-title"
    >
      <div className={css.atlasCollectionIntroIntroCopy}>
        <p className={css.atlasCollectionIntroEyebrow}>
          <span className={css.atlasCollectionIntroTinyDot} />
          {eyebrow}
        </p>
        <h1 id="page-title">{title}</h1>
        <p>{description}</p>
      </div>
    </section>
  );
}
