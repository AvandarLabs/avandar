import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import {
  durationInFrames,
  storyboardSchema,
  type Shot,
  type Storyboard,
} from "../../storyboard/schema/schema";
import { CONTINUITY_CATALOG, isSceneEntry } from "../continuityCatalog";
import { hasControlPath } from "./hasControlPath/hasControlPath";

const SCENE_STUDIES = CONTINUITY_CATALOG.filter((entry) => {
  return entry.family === "vocabulary" && isSceneEntry(entry);
});
const SCENE_CATEGORIES = [
  "transitions",
  "compositions",
  "entrances-and-reveals",
];
const SHOT_FIELDS = ["props", "transition", "transitionInFrames", "theme"];

function _readPlan(path: string): Storyboard {
  return storyboardSchema.parse(
    JSON.parse(
      fs.readFileSync(
        new URL(`../../../storyboards/${path}.json`, import.meta.url),
        "utf8",
      ),
    ),
  );
}

const PLANS = SCENE_STUDIES.map((entry) => {
  return {
    entry,
    plan: _readPlan(entry.path),
  };
});

test("scene studies play 1920 by 1080 storyboard scenes from storyboards/vocabulary", () => {
  assert.ok(PLANS.length > 0);
  PLANS.forEach(({ entry, plan }) => {
    assert.ok(entry.path.startsWith("vocabulary/"), entry.id);
    assert.equal(plan.id, entry.id);
    assert.equal(plan.title, entry.title, entry.id);
    assert.deepEqual([plan.width, plan.height], [1920, 1080], entry.id);
    assert.equal(entry.frames, durationInFrames(plan), entry.id);
    assert.ok(
      plan.shots.every((shot) => {
        return shot.scene !== "continuity" && shot.scene !== "avandar";
      }),
      `${entry.id} plays plain storyboard scenes only`,
    );
  });
});

test("every scene study control names a shot field its plan actually sets", () => {
  PLANS.forEach(({ entry, plan }) => {
    if (entry.family !== "vocabulary") {
      return;
    }
    assert.ok(entry.controls.length > 0, entry.id);
    entry.controls.forEach((control) => {
      const path = control.path.split(".");
      assert.ok(SHOT_FIELDS.includes(path[0]), `${entry.id}: ${control.path}`);
      assert.ok(
        plan.shots.some((shot) => {
          return hasControlPath(shot, path);
        }),
        `${entry.id}: ${control.path}`,
      );
    });
  });
});

test("scene studies link a scene sample film and sit in adjacent category groups", () => {
  const categories = SCENE_STUDIES.map((entry) => {
    return entry.category;
  });
  SCENE_CATEGORIES.forEach((category) => {
    return assert.ok(categories.includes(category), category);
  });
  SCENE_STUDIES.forEach((entry) => {
    assert.ok(SCENE_CATEGORIES.includes(entry.category), entry.id);
    const film = CONTINUITY_CATALOG.find((candidate) => {
      return entry.family === "vocabulary" && candidate.id === entry.sourceFilm;
    });
    assert.equal(film?.family, "films", entry.id);
    assert.ok(film && isSceneEntry(film), entry.id);
    assert.equal(film && durationInFrames(_readPlan(film.path)), film?.frames);
  });
  const studies = CONTINUITY_CATALOG.filter((entry) => {
    return entry.family === "vocabulary";
  });
  const order = studies
    .map((entry) => {
      return entry.category;
    })
    .filter((category, index, all) => {
      return category !== all[index - 1];
    });
  assert.equal(new Set(order).size, order.length, "categories stay grouped");
});

type ShotCheck = (shot: Shot, following: Shot | undefined) => boolean;

/** Every piece of storyboard vocabulary a scene study must make visible. */
const PIECES: Record<string, ShotCheck> = {
  "stepped wipe with custom columns": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      shot.transition.columns !== undefined
    );
  },
  "stepped wipe with a fractional stagger": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      (shot.transition.staggerFrames ?? 0) % 1 !== 0
    );
  },
  "stepped wipe from the top": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      shot.transition.from === "top"
    );
  },
  "stepped wipe right to left": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      shot.transition.order === "right-to-left"
    );
  },
  "stepped wipe over a frozen shot": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      shot.transition.outgoing !== "playing"
    );
  },
  "stepped wipe over a playing shot with drift and blur": (shot) => {
    return (
      shot.transition?.kind === "stepped-column-wipe" &&
      shot.transition.outgoing === "playing" &&
      (shot.transition.outgoingDrift?.blur ?? 0) > 0
    );
  },
  "hard cut between field colours": (shot, following) => {
    return (
      following !== undefined &&
      following.transitionInFrames === 0 &&
      following.theme?.ground !== undefined &&
      following.theme.ground !== shot.theme?.ground
    );
  },
  "whip exit into a cut": (shot, following) => {
    return (
      shot.scene === "tilted-window" &&
      shot.props.exit !== undefined &&
      following?.transitionInFrames === 0
    );
  },
  "long whip exit under a playing column wipe": (shot, following) => {
    return (
      shot.scene === "tilted-window" &&
      shot.props.exit?.atFrame === shot.durationInFrames - 1 &&
      (shot.props.exit.durationInFrames ?? 0) > 8 &&
      following?.transition?.kind === "stepped-column-wipe" &&
      following.transition.outgoing === "playing"
    );
  },
  "fly-through exit into a token colour": (shot) => {
    return (
      shot.scene === "brand-lockup" &&
      shot.props.exit?.kind === "fly-through" &&
      shot.props.exit.color !== undefined
    );
  },
  ..._tiltedWindowPieces(),
  ..._sceneMotionPieces(),
};

function _tiltedWindowPieces(): Record<string, ShotCheck> {
  const windowWith = (
    check: (
      props: Extract<Shot, { scene: "tilted-window" }>["props"],
    ) => boolean,
  ) => {
    return (shot: Shot) => {
      return shot.scene === "tilted-window" && check(shot.props);
    };
  };
  return {
    "window headline column": windowWith((props) => {
      return !!props.headlines?.length;
    }),
    "carousel slide": windowWith((props) => {
      return !!props.windows?.some((item) => {
        return item.swap === "slide";
      });
    }),
    "carousel cut": windowWith((props) => {
      return !!props.windows?.some((item) => {
        return item.swap === "cut";
      });
    }),
    "scroll steps": windowWith((props) => {
      return !!props.windows?.some((item) => {
        return item.scrollSteps;
      });
    }),
    "window camera": windowWith((props) => {
      return !!props.camera;
    }),
    "secondary window": windowWith((props) => {
      return !!props.secondary;
    }),
    "default window box": windowWith((props) => {
      return props.layout !== "pair" && props.windowBox !== "tall";
    }),
    "tall window box": windowWith((props) => {
      return props.windowBox === "tall";
    }),
    "window footnote": windowWith((props) => {
      return !!props.footnote;
    }),
    "racing pair": windowWith((props) => {
      return props.layout === "pair";
    }),
    "whip entrance with a stepped reveal": windowWith((props) => {
      return props.enter?.kind === "whip" && !!props.enter.reveal;
    }),
    "pull-back entrance": windowWith((props) => {
      return props.enter?.kind === "pull-back";
    }),
    "from-sides entrance": windowWith((props) => {
      return props.enter?.kind === "from-sides";
    }),
    "flip-split entrance": windowWith((props) => {
      return props.enter?.kind === "flip-split";
    }),
  };
}

function _sceneMotionPieces(): Record<string, ShotCheck> {
  const headingWipe = (scene: Shot["scene"]) => {
    return (shot: Shot) => {
      return (
        shot.scene === scene &&
        "headingReveal" in shot.props &&
        shot.props.headingReveal?.mode === "wipe"
      );
    };
  };
  const typography = (
    check: (props: Extract<Shot, { scene: "typography" }>["props"]) => boolean,
  ) => {
    return (shot: Shot) => {
      return shot.scene === "typography" && check(shot.props);
    };
  };
  const graph = (
    check: (props: Extract<Shot, { scene: "graph" }>["props"]) => boolean,
  ) => {
    return (shot: Shot) => {
      return shot.scene === "graph" && check(shot.props);
    };
  };
  const bars = (
    check: (
      props: Extract<Shot, { scene: "bar-comparison" }>["props"],
    ) => boolean,
  ) => {
    return (shot: Shot) => {
      return shot.scene === "bar-comparison" && check(shot.props);
    };
  };
  return {
    "brand lockup column build, wordmark and typed command": (shot) => {
      return (
        shot.scene === "brand-lockup" &&
        !!shot.props.build &&
        !!shot.props.wordmark &&
        !!shot.props.cta?.command
      );
    },
    "one bar panel": bars((props) => {
      return props.panels.length === 1;
    }),
    "two bar panels with rough edges and an erase": bars((props) => {
      return (
        props.panels.length === 2 &&
        props.barEdge === "rough" &&
        props.exit?.kind === "erase"
      );
    }),
    "bar footnote": bars((props) => {
      return !!props.footnote;
    }),
    "line-fade typography": typography((props) => {
      return props.revealMode === "line-fade";
    }),
    "wipe typography": typography((props) => {
      return props.revealMode === "wipe";
    }),
    "cut typography": typography((props) => {
      return props.revealMode === "cut";
    }),
    "typography icon": typography((props) => {
      return !!props.icon;
    }),
    "typography staged exit": typography((props) => {
      return !!props.exit;
    }),
    "caption-size typography": typography((props) => {
      return props.size === "caption";
    }),
    "graph heading wipe": headingWipe("graph"),
    "metric heading wipe": headingWipe("metric"),
    "typography heading wipe": headingWipe("typography"),
    "bar-comparison heading wipe": headingWipe("bar-comparison"),
    "graph packets": graph((props) => {
      return props.edges.some((edge) => {
        return edge.packets;
      });
    }),
    "parallel edges": graph((props) => {
      return props.edges.some((edge) => {
        return edge.offset;
      });
    }),
    "arrowless edges": graph((props) => {
      return props.edges.some((edge) => {
        return edge.arrow === false;
      });
    }),
    "node items": graph((props) => {
      return props.nodes.some((node) => {
        return node.items;
      });
    }),
    "tick frames": graph((props) => {
      return props.nodes.some((node) => {
        return node.frame === "ticks";
      });
    }),
  };
}

test("the scene studies together show every new piece of storyboard vocabulary", () => {
  Object.entries(PIECES).forEach(([piece, check]) => {
    assert.ok(
      PLANS.some(({ plan }) => {
        return plan.shots.some((shot, index) => {
          return check(shot, plan.shots[index + 1]);
        });
      }),
      piece,
    );
  });
});
