You are a motion design director checking a recreation. Two videos are attached:

- **REFERENCE**: the original.
- **CANDIDATE**: a rebuild that intentionally uses different content, words, product UI, and colors (it uses another brand's design tokens).

A CONTEXT FILE named `motion-spec.md` is also attached. It is the spec the rebuild team worked from. They could not see REFERENCE.

## What to judge

Ignore content, copy, product UI details, brand, and exact colors. Judge only whether CANDIDATE reproduces REFERENCE's:

1. **motion**: how elements enter, live, and exit (properties, easing feel, staggers, overshoot, speed).
2. **transitions**: how shots become the next shot (mechanism, direction, duration, blur).
3. **composition**: layout templates, element placement and scale, layering, depth and perspective.
4. **pacing**: shot lengths, beat timing, holds, overall duration and acceleration.
5. **vibe**: overall energy and style, as a viewer would feel it. Color ROLES count here (for example "one saturated accent on a dark field"), exact hues do not.

Ignore sound: the reference may have no audio track.

Align the two videos shot by shot first. They may differ slightly in duration. Map each REFERENCE shot to the CANDIDATE shot that plays its role.

## Blame

For every difference, decide who caused it by reading `motion-spec.md`:

- `spec`: the spec is missing the detail, describes it wrongly, or is ambiguous. The fix belongs in how the spec is written.
- `build`: the spec described it correctly and the candidate did not follow it.
- `platform`: following the spec would need a capability the rebuild clearly lacked (for example true motion blur); the candidate approximated it.

## Scoring

Score each dimension 0 to 10, where 10 is indistinguishable in that dimension, 7 is "a viewer would say it moves the same way, with noticeable but non-structural deviations", and 4 or less means the core beat is wrong or missing.

`acceptable` is true only when every dimension scores 7 or more AND there is no `critical` difference. A `critical` difference is a core beat that is missing, a wrong transition mechanism, a wrong composition template, or pacing off by more than 25% across an act.

## Output

Return only JSON, matching this shape:

```json
{
  "shot_alignment": [
    { "reference_shot": "S1", "reference_frames": [0, 120], "candidate_frames": [0, 118], "match": "good | partial | missing | extra" }
  ],
  "scores": { "motion": 0, "transitions": 0, "composition": 0, "pacing": 0, "vibe": 0 },
  "overall": 0,
  "acceptable": false,
  "differences": [
    {
      "id": "D1",
      "dimension": "motion | transitions | composition | pacing | vibe",
      "severity": "critical | major | minor",
      "reference_time": "mm:ss.f",
      "candidate_time": "mm:ss.f",
      "reference_does": "what happens in REFERENCE",
      "candidate_does": "what happens in CANDIDATE",
      "blame": "spec | build | platform",
      "spec_gap": "for blame=spec: what the spec should have said, and which spec section",
      "fix": "the concrete change that would close the gap"
    }
  ],
  "strengths": ["what CANDIDATE already gets right"]
}
```

List every difference you can see, most severe first. Be concrete with frames and values.
