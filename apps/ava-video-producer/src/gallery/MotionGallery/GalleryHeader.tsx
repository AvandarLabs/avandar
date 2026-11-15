import { Icon } from "./Icon";
import type { ReactNode } from "react";

/** Navigation to the motion library and other showcases. */
export function GalleryHeader(): ReactNode {
  return (
    <header className="site-header">
      <a
        href="motion.html"
        className="brand"
        aria-label="Avandar Motion Atlas home"
      >
        <img
          className="brand-mark"
          src="/brand/avandar-logo.png"
          alt=""
          width={40}
          height={40}
        />
        <span>
          Avandar
          <span className="brand-divider">/</span>
          <span className="brand-room">Motion Atlas</span>
        </span>
      </a>
      <nav aria-label="Showcase">
        <a href="index.html">Starter showcase</a>
        <a href="productions.html">
          Productions
          <Icon name="arrow" size={15} />
        </a>
      </nav>
      <span className="header-edition">
        A LIBRARY IN MOTION
        <span className="tiny-dot" />
      </span>
    </header>
  );
}
