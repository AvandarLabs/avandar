# PDF table assistant eval runs

Every run of `scripts/ai-eval/pdf/runPdfAssistEval.ts`, copied from
`.temp/ai-eval/pdf-runs/`. Each folder holds `summary.json` and
`results.jsonl` (every region's reply, its rows, and its grade). Labels
starting `holdout` ran the 121 held-out regions, where "spurious" counts
real figures (there is no answer key) and only fabrication is graded. How to
read and reproduce them: [eval.md](../../eval.md#pdf-table-assistant).

| Run (UTC) | Label | Answers | Required found | Spurious | Fabricated | Wrong subject | Empty replies | Cost per region |
|---|---|---|---|---|---|---|---|---|
| [2026-11-08T14-49-32](2026-11-08T14-49-32-chat-route_anthropic_claude-haiku-5.5/results.jsonl) | `chat-route:anthropic/claude-haiku-5.5` | 34 | 15/42 | 3 | 0 | 0 | 10 | $0.00161 |
| [2026-11-08T14-50-26](2026-11-08T14-50-26-chat-route_anthropic_claude-sonnet-5/results.jsonl) | `chat-route:anthropic/claude-sonnet-5` | 34 | 15/42 | 0 | 0 | 0 | 11 | $0.03130 |
| [2026-11-08T14-53-43](2026-11-08T14-53-43-extract-v0_anthropic_claude-haiku-5.5/results.jsonl) | `extract-v0:anthropic/claude-haiku-5.5` | 34 | 35/42 | 14 | 0 | 5 | 0 | $0.00049 |
| [2026-11-08T14-53-53](2026-11-08T14-53-53-extract-v0_anthropic_claude-sonnet-5/results.jsonl) | `extract-v0:anthropic/claude-sonnet-5` | 34 | 35/42 | 17 | 0 | 0 | 1 | $0.00650 |
| [2026-11-08T14-55-23](2026-11-08T14-55-23-extract-v1_anthropic_claude-haiku-5.5/results.jsonl) | `extract-v1:anthropic/claude-haiku-5.5` | 34 | 42/42 | 0 | 0 | 3 | 0 | $0.00044 |
| [2026-11-08T14-56-11](2026-11-08T14-56-11-extract-v1_anthropic_claude-sonnet-5/results.jsonl) | `extract-v1:anthropic/claude-sonnet-5` | 34 | 40/42 | 0 | 0 | 0 | 2 | $0.00783 |
| [2026-11-08T14-57-07](2026-11-08T14-57-07-extract-v2_anthropic_claude-haiku-5.5/results.jsonl) | `extract-v2:anthropic/claude-haiku-5.5` | 51 | 63/63 | 0 | 0 | 0 | 0 | $0.00049 |
| [2026-11-08T14-57-46](2026-11-08T14-57-46-extract-v2_anthropic_claude-sonnet-5/results.jsonl) | `extract-v2:anthropic/claude-sonnet-5` | 51 | 60/63 | 0 | 0 | 0 | 3 | $0.00684 |
| [2026-11-08T14-59-08](2026-11-08T14-59-08-holdout-v2_anthropic_claude-haiku-5.5/results.jsonl) | `holdout-v2:anthropic/claude-haiku-5.5` | 121 | 0/0 | 295 | 23 | 0 | 0 | $0.00082 |
| [2026-11-08T14-59-37](2026-11-08T14-59-37-holdout-v2_anthropic_claude-sonnet-5/results.jsonl) | `holdout-v2:anthropic/claude-sonnet-5` | 121 | 0/0 | 317 | 22 | 0 | 0 | $0.01486 |
| [2026-11-08T15-01-02](2026-11-08T15-01-02-extract-v3_anthropic_claude-haiku-5.5/results.jsonl) | `extract-v3:anthropic/claude-haiku-5.5` | 51 | 63/63 | 0 | 0 | 0 | 0 | $0.00050 |
| [2026-11-08T15-01-21](2026-11-08T15-01-21-holdout-v3_anthropic_claude-haiku-5.5/results.jsonl) | `holdout-v3:anthropic/claude-haiku-5.5` | 121 | 0/0 | 459 | 0 | 0 | 0 | $0.00081 |
| [2026-11-08T15-02-15](2026-11-08T15-02-15-extract-v3_anthropic_claude-sonnet-5/results.jsonl) | `extract-v3:anthropic/claude-sonnet-5` | 51 | 59/63 | 1 | 0 | 0 | 3 | $0.00925 |
| [2026-11-08T15-03-03](2026-11-08T15-03-03-holdout-v3_anthropic_claude-sonnet-5/results.jsonl) | `holdout-v3:anthropic/claude-sonnet-5` | 121 | 0/0 | 396 | 0 | 0 | 0 | $0.01463 |
