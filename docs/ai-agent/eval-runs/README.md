# Eval run archive

Every run of `scripts/ai-eval/runEval.ts` made for the Avandar agent work,
copied from `.temp/ai-eval/runs/` by `scripts/ai-eval/archiveEvalRuns.ts`.
Each folder holds `summary.json` (the row below) and `results.jsonl`
(every answer: its SQL, a preview of the result, the questions asked, the
grader's verdict, tokens, cost, and time). How to read and reproduce them:
[eval.md](../eval.md).

Runs with fewer than 45 questions are screens, reruns of single questions,
or smoke checks; the label says which. Times are UTC. The PDF table
assistant's runs are in [pdf/](pdf/README.md).

| Run (UTC) | Label | Correct | Needless | Missed | Cost per question | Latency p50 / p90 | Misses |
|---|---|---|---|---|---|---|---|
| [2026-11-07T20-54-49](2026-11-07T20-54-49-baseline_anthropic_claude-sonnet-5/results.jsonl) | `baseline:anthropic/claude-sonnet-5` | 2/2 | 0 | 0 | $0.01880 | 7.1 s / 7.1 s | none |
| [2026-11-07T20-55-34](2026-11-07T20-55-34-baseline_openai_gpt-5.6-terra/results.jsonl) | `baseline:openai/gpt-5.6-terra` | 43/45 | 0 | 0 | $0.00530 | 3.7 s / 6.9 s | N02 N11 |
| [2026-11-07T20-57-02](2026-11-07T20-57-02-baseline_anthropic_claude-sonnet-5/results.jsonl) | `baseline:anthropic/claude-sonnet-5` | 44/45 | 0 | 0 | $0.02551 | 4.4 s / 13.0 s | N11 |
| [2026-11-07T21-00-51](2026-11-07T21-00-51-pi_anthropic_claude-sonnet-5_off/results.jsonl) | `pi:anthropic/claude-sonnet-5@off` | 4/5 | 0 | 0 | $0.01081 | 6.9 s / 8.1 s | H01 |
| [2026-11-07T21-01-34](2026-11-07T21-01-34-pi_openai_gpt-5.6-terra_off/results.jsonl) | `pi:openai/gpt-5.6-terra@off` | 45/45 | 1 | 1 | $0.00583 | 2.6 s / 3.8 s | none |
| [2026-11-07T21-01-46](2026-11-07T21-01-46-pi_anthropic_claude-sonnet-5_off/results.jsonl) | `pi:anthropic/claude-sonnet-5@off` | 44/45 | 0 | 0 | $0.00453 | 3.8 s / 5.7 s | H06 |
| [2026-11-07T21-02-30](2026-11-07T21-02-30-pi_inception_mercury-3_off/results.jsonl) | `pi:inception/mercury-3@off` | 36/45 | 2 | 0 | $0.00018 | 1.0 s / 2.2 s | H01 H02 H04 H05 H06 H09 I04 N05 N09 |
| [2026-11-07T21-02-45](2026-11-07T21-02-45-pi_openai_gpt-6-luna_off/results.jsonl) | `pi:openai/gpt-6-luna@off` | 42/45 | 2 | 0 | $0.00026 | 2.3 s / 4.4 s | H07 I04 I08 |
| [2026-11-07T21-02-46](2026-11-07T21-02-46-pi_anthropic_claude-haiku-5.5_off/results.jsonl) | `pi:anthropic/claude-haiku-5.5@off` | 45/45 | 0 | 1 | $0.00030 | 2.5 s / 3.5 s | none |
| [2026-11-07T21-02-47](2026-11-07T21-02-47-pi_deepseek_deepseek-v4-flash_off/results.jsonl) | `pi:deepseek/deepseek-v4-flash@off` | 28/45 | 3 | 0 | $0.00029 | 2.3 s / 4.5 s | B02 F01 F02 F03 H01 H03 H04 H05 H06 H09 I08 I09 N02 N04 N05 N08 N09 |
| [2026-11-07T21-02-52](2026-11-07T21-02-52-pi_qwen_qwen3.7-flash_off/results.jsonl) | `pi:qwen/qwen3.7-flash@off` | 36/45 | 1 | 1 | $0.00009 | 2.6 s / 4.7 s | B10 F02 F03 H01 H06 H09 I04 N05 N09 |
| [2026-11-07T21-03-01](2026-11-07T21-03-01-pi_xiaomi_mimo-v2.6-flash_off/results.jsonl) | `pi:xiaomi/mimo-v2.6-flash@off` | 38/45 | 1 | 1 | $0.00013 | 3.1 s / 8.6 s | H01 H09 H10 I03 N01 N04 N12 |
| [2026-11-07T21-03-16](2026-11-07T21-03-16-pi_minimax_minimax-m3.1-flash_off/results.jsonl) | `pi:minimax/minimax-m3.1-flash@off` | 27/45 | 1 | 0 | $0.00074 | 3.8 s / 9.0 s | B06 F02 F03 H03 H04 H05 H07 H09 H10 I02 I03 I05 I08 N02 N03 N04 N05 N11 |
| [2026-11-07T21-03-29](2026-11-07T21-03-29-pi_z-ai_glm-5.3-flash_off/results.jsonl) | `pi:z-ai/glm-5.3-flash@off` | 41/45 | 0 | 0 | $0.00046 | 4.6 s / 13.1 s | H06 I04 N03 N08 |
| [2026-11-07T21-04-37](2026-11-07T21-04-37-pi_haiku-sonnet_1/results.jsonl) | `pi:haiku-sonnet#1` | 44/45 | 0 | 1 | $0.00025 | 2.7 s / 3.8 s | N11 |
| [2026-11-07T21-04-38](2026-11-07T21-04-38-pi_haiku-sonnet_2/results.jsonl) | `pi:haiku-sonnet#2` | 44/45 | 0 | 1 | $0.00050 | 2.5 s / 3.7 s | H07 |
| [2026-11-07T21-04-38](2026-11-07T21-04-38-pi_haiku-sonnet_3/results.jsonl) | `pi:haiku-sonnet#3` | 45/45 | 0 | 1 | $0.00025 | 2.6 s / 4.3 s | none |
| [2026-11-07T21-04-59](2026-11-07T21-04-59-baseline_claude-haiku-5.5_1/results.jsonl) | `baseline:claude-haiku-5.5#1` | 45/45 | 0 | 0 | $0.00142 | 4.1 s / 6.6 s | none |
| [2026-11-07T21-05-37](2026-11-07T21-05-37-pi_luna-haiku_2/results.jsonl) | `pi:luna-haiku#2` | 42/45 | 1 | 0 | $0.00026 | 2.4 s / 4.6 s | H07 I04 I07 |
| [2026-11-07T21-05-55](2026-11-07T21-05-55-baseline_claude-haiku-5.5_3/results.jsonl) | `baseline:claude-haiku-5.5#3` | 44/45 | 0 | 0 | $0.00135 | 4.1 s / 6.4 s | N11 |
| [2026-11-07T21-05-58](2026-11-07T21-05-58-baseline_claude-haiku-5.5_2/results.jsonl) | `baseline:claude-haiku-5.5#2` | 44/45 | 0 | 0 | $0.00130 | 4.1 s / 6.2 s | H06 |
| [2026-11-07T21-19-57](2026-11-07T21-19-57-pi_luna-haiku_1/results.jsonl) | `pi:luna-haiku#1` | 42/45 | 0 | 0 | $0.00192 | 2.5 s / 3.9 s | I02 I04 N09 |
| [2026-11-07T21-20-29](2026-11-07T21-20-29-pi_gpt-5.6-terra_2/results.jsonl) | `pi:gpt-5.6-terra#2` | 45/45 | 1 | 0 | $0.00614 | 2.3 s / 3.2 s | none |
| [2026-11-07T21-20-45](2026-11-07T21-20-45-pi_claude-sonnet-5_2/results.jsonl) | `pi:claude-sonnet-5#2` | 45/45 | 2 | 0 | $0.00498 | 3.7 s / 5.9 s | none |
| [2026-11-07T21-20-54](2026-11-07T21-20-54-baseline_gpt-5.6-terra_2/results.jsonl) | `baseline:gpt-5.6-terra#2` | 44/45 | 0 | 0 | $0.00517 | 3.8 s / 7.5 s | H07 |
| [2026-11-07T21-21-16](2026-11-07T21-21-16-baseline_claude-sonnet-5_2/results.jsonl) | `baseline:claude-sonnet-5#2` | 44/45 | 0 | 0 | $0.02341 | 5.1 s / 9.8 s | N11 |
| [2026-11-07T21-22-00](2026-11-07T21-22-00-final_pi_haiku-sonnet_5/results.jsonl) | `final:pi:haiku-sonnet#5` | 44/45 | 0 | 0 | $0.00028 | 2.4 s / 3.6 s | N06 |
| [2026-11-07T21-22-01](2026-11-07T21-22-01-final_pi_haiku-sonnet_2/results.jsonl) | `final:pi:haiku-sonnet#2` | 45/45 | 0 | 0 | $0.00028 | 2.3 s / 3.8 s | none |
| [2026-11-07T21-22-01](2026-11-07T21-22-01-final_pi_haiku-sonnet_3/results.jsonl) | `final:pi:haiku-sonnet#3` | 45/45 | 0 | 0 | $0.00055 | 2.4 s / 3.7 s | none |
| [2026-11-07T21-22-01](2026-11-07T21-22-01-final_pi_haiku-sonnet_4/results.jsonl) | `final:pi:haiku-sonnet#4` | 45/45 | 0 | 0 | $0.00028 | 2.3 s / 3.7 s | none |
| [2026-11-07T21-22-02](2026-11-07T21-22-02-final_pi_haiku-sonnet_1/results.jsonl) | `final:pi:haiku-sonnet#1` | 45/45 | 0 | 0 | $0.00029 | 2.2 s / 3.2 s | none |
| [2026-11-07T21-22-38](2026-11-07T21-22-38-final_pi_openai_gpt-6-luna/results.jsonl) | `final:pi:openai/gpt-6-luna` | 44/45 | 1 | 0 | $0.00027 | 2.5 s / 4.1 s | I07 |
| [2026-11-07T21-22-41](2026-11-07T21-22-41-final_pi_z-ai_glm-5.3/results.jsonl) | `final:pi:z-ai/glm-5.3` | 44/45 | 0 | 0 | $0.00210 | 2.1 s / 7.4 s | H09 |
| [2026-11-07T21-22-54](2026-11-07T21-22-54-final_pi_moonshotai_kimi-k2.6/results.jsonl) | `final:pi:moonshotai/kimi-k2.6` | 38/45 | 3 | 1 | $0.00138 | 2.9 s / 7.0 s | B08 H06 H09 I04 N04 N06 N10 |
| [2026-11-07T21-23-15](2026-11-07T21-23-15-final_pi_z-ai_glm-5.3-flash/results.jsonl) | `final:pi:z-ai/glm-5.3-flash` | 42/45 | 0 | 0 | $0.00060 | 4.0 s / 13.9 s | H06 H09 N08 |
| [2026-11-07T21-23-44](2026-11-07T21-23-44-final_pi_google_gemini-3.5-flash-lite/results.jsonl) | `final:pi:google/gemini-3.5-flash-lite` | 32/45 | 0 | 0 | $0.00158 | 1.5 s / 4.0 s | B01 B04 B09 H01 H05 H08 I01 I04 I07 N02 N05 N09 N11 |
| [2026-11-07T21-24-05](2026-11-07T21-24-05-final_pi_deepseek_deepseek-v4-pro/results.jsonl) | `final:pi:deepseek/deepseek-v4-pro` | 41/45 | 1 | 0 | $0.00120 | 4.0 s / 6.6 s | B08 H01 H09 N05 |
| [2026-11-07T21-24-34](2026-11-07T21-24-34-final_pi_qwen_qwen3.7-plus/results.jsonl) | `final:pi:qwen/qwen3.7-plus` | 40/45 | 2 | 0 | $0.00071 | 5.6 s / 8.6 s | H01 H06 H09 I04 N11 |
| [2026-11-07T21-25-31](2026-11-07T21-25-31-final_pi_xiaomi_mimo-v2.6-pro/results.jsonl) | `final:pi:xiaomi/mimo-v2.6-pro` | 40/45 | 0 | 1 | $0.00035 | 4.2 s / 12.7 s | H01 H03 H07 I04 N04 |
| [2026-11-07T21-54-02](2026-11-07T21-54-02-final_pi_haiku-sonnet_post-format/results.jsonl) | `final:pi:haiku-sonnet#post-format` | 45/45 | 0 | 0 | $0.00027 | 2.4 s / 3.2 s | none |
| [2026-11-08T02-05-30](2026-11-08T02-05-30-d21_anthropic_claude-sonnet-5_1/results.jsonl) | `d21:anthropic/claude-sonnet-5#1` | 1/1 | 0 | 0 | $0.02227 | 6.5 s / 6.5 s | none |
| [2026-11-08T02-05-40](2026-11-08T02-05-40-d21_anthropic_claude-sonnet-5_2/results.jsonl) | `d21:anthropic/claude-sonnet-5#2` | 1/1 | 0 | 0 | $0.02639 | 9.5 s / 9.5 s | none |
| [2026-11-08T02-05-49](2026-11-08T02-05-49-d21_openai_gpt-5.6-terra_1/results.jsonl) | `d21:openai/gpt-5.6-terra#1` | 1/1 | 0 | 0 | $0.01835 | 7.7 s / 7.7 s | none |
| [2026-11-08T02-05-54](2026-11-08T02-05-54-d21_openai_gpt-5.6-terra_2/results.jsonl) | `d21:openai/gpt-5.6-terra#2` | 1/1 | 0 | 0 | $0.00636 | 4.3 s / 4.3 s | none |
| [2026-11-08T02-06-51](2026-11-08T02-06-51-d21_sonnet-5_full/results.jsonl) | `d21:sonnet-5:full` | 42/45 | 1 | 0 | $0.02375 | 4.7 s / 11.7 s | F01 F02 F03 |
| [2026-11-08T02-07-18](2026-11-08T02-07-18-d21_followups_1/results.jsonl) | `d21:followups#1` | 5/5 | 0 | 0 | $0.01902 | 3.5 s / 5.8 s | none |
| [2026-11-08T02-07-31](2026-11-08T02-07-31-d21_followups_2/results.jsonl) | `d21:followups#2` | 5/5 | 0 | 0 | $0.01909 | 3.0 s / 6.0 s | none |
| [2026-11-08T02-22-16](2026-11-08T02-22-16-local_qwen3-4b_cloud-prompt/results.jsonl) | `local:qwen3-4b:cloud-prompt` | 8/45 | 0 | 2 | $0.00000 | 16.2 s / 79.1 s | B01 B02 B04 B05 B06 B07 B08 B10 F01 F02 F03 H01 H02 H03 H05 H06 H07 H08 H09 H10 I01 I02 I03 I04 I05 I07 I09 I10 N01 N02 N03 N04 N05 N09 N10 N11 N12 |
| [2026-11-08T02-45-55](2026-11-08T02-45-55-local_qwen3-4b_v1/results.jsonl) | `local:qwen3-4b:v1` | 28/45 | 0 | 2 | $0.00000 | 46.0 s / 62.2 s | B08 B09 H01 H02 H05 H06 H09 H10 I04 I07 I09 N03 N04 N05 N07 N09 N11 |
| [2026-11-08T02-54-28](2026-11-08T02-54-28-smoke/results.jsonl) | `smoke` | 1/1 | 0 | 0 | $0.00000 | 101.4 s / 101.4 s | none |
| [2026-11-08T03-22-42](2026-11-08T03-22-42-local_qwen3-4b_plan-v2/results.jsonl) | `local:qwen3-4b:plan-v2` | 17/45 | 16 | 1 | $0.00000 | 20.5 s / 40.6 s | B03 B04 B07 B10 H01 H02 H03 H04 H05 H06 H07 H08 H09 H10 I01 I02 I03 I04 I07 I08 I09 I10 N02 N04 N08 N09 N10 N11 |
| [2026-11-08T03-42-35](2026-11-08T03-42-35-local_qwen3-4b_plan-v3/results.jsonl) | `local:qwen3-4b:plan-v3` | 20/45 | 0 | 1 | $0.00000 | 18.2 s / 32.3 s | B01 B07 B08 B09 H01 H02 H04 H05 H06 H08 H09 H10 I02 I03 I07 I08 I09 I10 N01 N02 N04 N05 N08 N11 N12 |
| [2026-11-08T04-11-58](2026-11-08T04-11-58-capcheck/results.jsonl) | `capcheck` | 4/5 | 0 | 0 | $0.00042 | 2.6 s / 4.7 s | F01 |
| [2026-11-08T04-19-15](2026-11-08T04-19-15-local_Qwen3-4B-q4f16_1-MLC_screen/results.jsonl) | `local:Qwen3-4B-q4f16_1-MLC:screen` | 12/20 | 0 | 1 | $0.00000 | 15.1 s / 26.4 s | B09 H01 H05 H09 I07 I09 N04 N10 |
| [2026-11-08T04-24-40](2026-11-08T04-24-40-local_qwen3-4b_sql-v3/results.jsonl) | `local:qwen3-4b:sql-v3` | 26/45 | 0 | 1 | $0.00000 | 15.1 s / 24.2 s | B08 H01 H02 H05 H06 H08 H09 H10 I04 I06 I07 I08 I09 N01 N03 N04 N10 N11 N12 |
| [2026-11-08T04-27-02](2026-11-08T04-27-02-local_Qwen3.5-4B-q4f16_1-MLC_screen/results.jsonl) | `local:Qwen3.5-4B-q4f16_1-MLC:screen` | 9/20 | 0 | 1 | $0.00000 | 15.5 s / 77.1 s | B01 B05 H01 H03 H09 I01 I03 I05 I07 I09 N04 |
| [2026-11-08T04-37-54](2026-11-08T04-37-54-local_gemma-4-E2B-it-q4f16_1-MLC_screen/results.jsonl) | `local:gemma-4-E2B-it-q4f16_1-MLC:screen` | 2/20 | 2 | 2 | $0.00000 | 26.4 s / 50.2 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I07 I09 N02 N04 N06 N08 |
| [2026-11-08T04-45-45](2026-11-08T04-45-45-local_Phi-4-mini-instruct-q4f16_1-MLC_screen/results.jsonl) | `local:Phi-4-mini-instruct-q4f16_1-MLC:screen` | 2/20 | 1 | 1 | $0.00000 | 18.8 s / 33.7 s | B01 B03 B05 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N04 N06 N08 N10 |
| [2026-11-08T04-55-27](2026-11-08T04-55-27-local_Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC_screen/results.jsonl) | `local:Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC:screen` | 0/20 | 0 | 2 | $0.00000 | 28.7 s / 47.0 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N02 N04 N06 N08 N10 |
| [2026-11-08T05-05-29](2026-11-08T05-05-29-local_Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC_screen/results.jsonl) | `local:Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC:screen` | 9/20 | 0 | 2 | $0.00000 | 24.9 s / 64.4 s | B01 B09 H01 H03 H05 H07 H09 I03 I05 N04 N10 |
| [2026-11-08T05-12-00](2026-11-08T05-12-00-local_Qwen3.5-2B-q4f16_1-MLC_screen/results.jsonl) | `local:Qwen3.5-2B-q4f16_1-MLC:screen` | 0/20 | 5 | 0 | $0.00000 | 20.2 s / 28.8 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N02 N04 N06 N08 N10 |
| [2026-11-08T05-17-45](2026-11-08T05-17-45-local_Llama-3.2-3B-Instruct-q4f16_1-MLC_screen/results.jsonl) | `local:Llama-3.2-3B-Instruct-q4f16_1-MLC:screen` | 1/20 | 0 | 2 | $0.00000 | 13.6 s / 23.7 s | B01 B03 B05 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N02 N04 N06 N08 N10 |
| [2026-11-08T07-10-40](2026-11-08T07-10-40-local_Qwen3-4B-q4f16_1-MLC_screen2/results.jsonl) | `local:Qwen3-4B-q4f16_1-MLC:screen2` | 12/20 | 0 | 1 | $0.00000 | 15.4 s / 26.5 s | B09 H01 H05 H09 I07 I09 N04 N10 |
| [2026-11-08T07-17-27](2026-11-08T07-17-27-local_Qwen3.5-4B-q4f16_1-MLC_screen2/results.jsonl) | `local:Qwen3.5-4B-q4f16_1-MLC:screen2` | 10/20 | 0 | 1 | $0.00000 | 14.1 s / 53.1 s | B01 B05 H01 H03 H09 I01 I03 I05 I07 N04 |
| [2026-11-08T07-38-12](2026-11-08T07-38-12-local_gemma-4-E2B-it-q4f16_1-MLC_screen2/results.jsonl) | `local:gemma-4-E2B-it-q4f16_1-MLC:screen2` | 2/20 | 2 | 2 | $0.00000 | 26.0 s / 290.3 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I07 I09 N02 N04 N06 N08 |
| [2026-11-08T07-51-22](2026-11-08T07-51-22-local_Qwen3.5-2B-q4f16_1-MLC_screen2/results.jsonl) | `local:Qwen3.5-2B-q4f16_1-MLC:screen2` | 0/20 | 5 | 0 | $0.00000 | 19.8 s / 109.5 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N02 N04 N06 N08 N10 |
| [2026-11-08T08-11-59](2026-11-08T08-11-59-local_Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC_screen2/results.jsonl) | `local:Ministral-3-3B-Instruct-2512-BF16-q4f16_1-MLC:screen2` | 0/20 | 0 | 2 | $0.00000 | 34.9 s / 194.1 s | B01 B03 B05 B07 B09 H01 H03 H05 H07 H09 I01 I03 I05 I07 I09 N02 N04 N06 N08 N10 |
| [2026-11-08T08-21-38](2026-11-08T08-21-38-local_Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC_screen2/results.jsonl) | `local:Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC:screen2` | 8/20 | 0 | 2 | $0.00000 | 25.3 s / 65.3 s | B01 B09 H01 H03 H05 H07 H09 I03 I05 I09 N04 N10 |
| [2026-11-08T08-22-12](2026-11-08T08-22-12-online_haiku-sonnet_regression/results.jsonl) | `online:haiku-sonnet:regression` | 44/45 | 0 | 0 | $0.00058 | 2.4 s / 3.5 s | N05 |
| [2026-11-08T08-22-20](2026-11-08T08-22-20-n05_1/results.jsonl) | `n05#1` | 1/1 | 0 | 0 | $0.00020 | 2.5 s / 2.5 s | none |
| [2026-11-08T08-22-25](2026-11-08T08-22-25-n05_2/results.jsonl) | `n05#2` | 1/1 | 0 | 0 | $0.00032 | 3.5 s / 3.5 s | none |
| [2026-11-08T08-22-28](2026-11-08T08-22-28-n05_3/results.jsonl) | `n05#3` | 1/1 | 0 | 0 | $0.00022 | 2.5 s / 2.5 s | none |
| [2026-11-08T08-22-33](2026-11-08T08-22-33-n05_4/results.jsonl) | `n05#4` | 1/1 | 0 | 0 | $0.00029 | 3.1 s / 3.1 s | none |
| [2026-11-08T08-35-22](2026-11-08T08-35-22-local_qwen3-4b_final/results.jsonl) | `local:qwen3-4b:final` | 26/45 | 0 | 1 | $0.00000 | 15.1 s / 24.1 s | B08 B09 H01 H02 H05 H06 H09 H10 I04 I06 I07 I08 I09 N01 N03 N04 N10 N11 N12 |
| [2026-11-08T08-50-49](2026-11-08T08-50-49-local_qwen3-qwen35_final/results.jsonl) | `local:qwen3-qwen35:final` | 26/45 | 0 | 1 | $0.00000 | 15.4 s / 28.1 s | B08 B09 H01 H02 H05 H06 H09 H10 I04 I06 I07 I08 I09 N01 N03 N04 N10 N11 N12 |
| [2026-11-08T09-04-48](2026-11-08T09-04-48-local_qwen3-4b_final2/results.jsonl) | `local:qwen3-4b:final2` | 26/45 | 0 | 1 | $0.00000 | 15.1 s / 24.1 s | B08 B09 H01 H02 H05 H06 H09 H10 I04 I06 I07 I08 I09 N03 N04 N07 N10 N11 N12 |
| [2026-11-08T14-24-03](2026-11-08T14-24-03-d31_today-haiku-5.5_1/results.jsonl) | `d31:today-haiku-5.5#1` | 44/45 | 0 | 0 | $0.00131 | 4.1 s / 6.2 s | N04 |
| [2026-11-08T14-24-03](2026-11-08T14-24-03-d31_today-haiku-5.5_2/results.jsonl) | `d31:today-haiku-5.5#2` | 45/45 | 0 | 0 | $0.00145 | 4.1 s / 6.3 s | none |
| [2026-11-08T15-12-12](2026-11-08T15-12-12-d04_online-agent/results.jsonl) | `d04:online-agent` | 44/45 | 1 | 0 | $0.00031 | 2.4 s / 3.8 s | H06 |
| [2026-11-08T15-12-20](2026-11-08T15-12-20-d04_h06_1/results.jsonl) | `d04:h06#1` | 1/1 | 0 | 0 | $0.00036 | 3.4 s / 3.4 s | none |
| [2026-11-08T15-12-24](2026-11-08T15-12-24-d04_h06_2/results.jsonl) | `d04:h06#2` | 1/1 | 0 | 0 | $0.00036 | 3.2 s / 3.2 s | none |
| [2026-11-08T15-12-28](2026-11-08T15-12-28-d04_h06_3/results.jsonl) | `d04:h06#3` | 1/1 | 0 | 0 | $0.00033 | 3.0 s / 3.0 s | none |
| [2026-11-08T15-12-33](2026-11-08T15-12-33-d04_h06_4/results.jsonl) | `d04:h06#4` | 1/1 | 0 | 0 | $0.00033 | 2.9 s / 2.9 s | none |
| [2026-11-09T00-15-53](2026-11-09T00-15-53-phase-1a_agent-45/results.jsonl) | `phase-1a:agent-45` | 45/45 | 0 | 0 | $0.00030 | 2.7 s / 8.8 s | none |
| [2026-11-09T00-16-32](2026-11-09T00-16-32-phase-1a_agent-page/results.jsonl) | `phase-1a:agent-page` | 6/6 | 0 | 0 | $0.00021 | 5.5 s / 5.9 s | none |
| [2026-11-09T00-17-00](2026-11-09T00-17-00-phase-1a_agent-page_2/results.jsonl) | `phase-1a:agent-page #2` | 6/6 | 0 | 0 | $0.00019 | 5.4 s / 6.0 s | none |
| [2026-11-09T00-17-35](2026-11-09T00-17-35-phase-1a_agent-page_3/results.jsonl) | `phase-1a:agent-page #3` | 6/6 | 0 | 0 | $0.00019 | 7.9 s / 8.3 s | none |
| [2026-11-09T00-18-12](2026-11-09T00-18-12-phase-1a_today-page/results.jsonl) | `phase-1a:today-page` | 2/3 | 1 | 0 | $0.00190 | 6.3 s / 7.1 s | P01 |
| [2026-11-09T04-05-30](2026-11-09T04-05-30-phase-1a-redaction_agent-page/results.jsonl) | `phase-1a-redaction:agent-page` | 7/7 | 0 | 0 | $0.00036 | 2.2 s / 2.7 s | none |
| [2026-11-09T04-06-00](2026-11-09T04-06-00-phase-1a-redaction_agent-page/results.jsonl) | `phase-1a-redaction:agent-page` | 6/7 | 1 | 0 | $0.00021 | 1.8 s / 2.7 s | P07 |
| [2026-11-09T04-06-49](2026-11-09T04-06-49-phase-1a-redaction_agent-page/results.jsonl) | `phase-1a-redaction:agent-page` | 7/7 | 0 | 0 | $0.00031 | 1.8 s / 2.9 s | none |
| [2026-11-09T04-07-01](2026-11-09T04-07-01-phase-1a-redaction_p07-repeat/results.jsonl) | `phase-1a-redaction:p07-repeat` | 1/1 | 0 | 0 | $0.00019 | 2.0 s / 2.0 s | none |
| [2026-11-09T04-07-05](2026-11-09T04-07-05-phase-1a-redaction_p07-repeat/results.jsonl) | `phase-1a-redaction:p07-repeat` | 1/1 | 0 | 0 | $0.00019 | 2.0 s / 2.0 s | none |
| [2026-11-09T04-08-54](2026-11-09T04-08-54-phase-1a-redaction_agent-45/results.jsonl) | `phase-1a-redaction:agent-45` | 45/45 | 0 | 0 | $0.00026 | 2.1 s / 3.3 s | none |
| [2026-11-09T04-39-31](2026-11-09T04-39-31-phase-1a-redaction-review_agent-45/results.jsonl) | `phase-1a-redaction-review:agent-45` | 43/45 | 0 | 0 | $0.00030 | 2.4 s / 3.4 s | H06 N04 |
| [2026-11-09T04-39-38](2026-11-09T04-39-38-phase-1a-redaction-review_agent-page/results.jsonl) | `phase-1a-redaction-review:agent-page` | 7/7 | 0 | 0 | $0.00022 | 1.8 s / 2.6 s | none |
| [2026-11-09T04-39-55](2026-11-09T04-39-55-phase-1a-redaction-review_rerun/results.jsonl) | `phase-1a-redaction-review:rerun` | 2/2 | 0 | 0 | $0.00036 | 3.6 s / 3.6 s | none |
| [2026-11-09T04-40-01](2026-11-09T04-40-01-phase-1a-redaction-review_rerun/results.jsonl) | `phase-1a-redaction-review:rerun` | 1/2 | 0 | 0 | $0.00039 | 3.7 s / 3.7 s | H06 |
| [2026-11-09T04-40-06](2026-11-09T04-40-06-phase-1a-redaction-review_rerun/results.jsonl) | `phase-1a-redaction-review:rerun` | 2/2 | 0 | 0 | $0.00032 | 3.2 s / 3.2 s | none |
| [2026-11-09T04-58-02](2026-11-09T04-58-02-phase-1a-redaction-review2_agent-page/results.jsonl) | `phase-1a-redaction-review2:agent-page` | 6/7 | 0 | 1 | $0.00034 | 1.9 s / 2.1 s | P04 |
| [2026-11-09T04-58-42](2026-11-09T04-58-42-phase-1a-redaction-review2_agent-45/results.jsonl) | `phase-1a-redaction-review2:agent-45` | 43/45 | 0 | 0 | $0.00062 | 2.1 s / 3.3 s | N02 N04 |
| [2026-11-09T04-59-12](2026-11-09T04-59-12-phase-1a-redaction-review2_rerun/results.jsonl) | `phase-1a-redaction-review2:rerun` | 2/3 | 0 | 2 | $0.00018 | 2.1 s / 2.3 s | P04 |
| [2026-11-09T04-59-17](2026-11-09T04-59-17-phase-1a-redaction-review2_rerun/results.jsonl) | `phase-1a-redaction-review2:rerun` | 2/3 | 0 | 0 | $0.00026 | 3.1 s / 3.5 s | N04 |
| [2026-11-09T04-59-22](2026-11-09T04-59-22-phase-1a-redaction-review2_rerun/results.jsonl) | `phase-1a-redaction-review2:rerun` | 1/3 | 0 | 2 | $0.00019 | 2.3 s / 2.7 s | N04 P04 |
| [2026-11-09T04-59-49](2026-11-09T04-59-49-phase-1a-redaction-review2_p04-check/results.jsonl) | `phase-1a-redaction-review2:p04-check` | 2/2 | 0 | 0 | $0.00049 | 3.0 s / 3.0 s | none |
| [2026-11-09T04-59-55](2026-11-09T04-59-55-phase-1a-redaction-review2_p04-check/results.jsonl) | `phase-1a-redaction-review2:p04-check` | 2/2 | 0 | 0 | $0.00024 | 2.8 s / 2.8 s | none |
| [2026-11-09T05-00-00](2026-11-09T05-00-00-phase-1a-redaction-review2_p04-check/results.jsonl) | `phase-1a-redaction-review2:p04-check` | 2/2 | 0 | 0 | $0.00023 | 2.9 s / 2.9 s | none |
| [2026-11-09T05-00-05](2026-11-09T05-00-05-phase-1a-redaction-review2_p04-check/results.jsonl) | `phase-1a-redaction-review2:p04-check` | 2/2 | 0 | 0 | $0.00023 | 3.1 s / 3.1 s | none |
| [2026-11-09T05-00-55](2026-11-09T05-00-55-phase-1a-redaction-review2_agent-45-final/results.jsonl) | `phase-1a-redaction-review2:agent-45-final` | 44/45 | 0 | 0 | $0.00026 | 2.1 s / 3.2 s | N04 |
| [2026-11-09T05-01-03](2026-11-09T05-01-03-phase-1a-redaction-review2_agent-page-final/results.jsonl) | `phase-1a-redaction-review2:agent-page-final` | 7/7 | 0 | 0 | $0.00020 | 1.7 s / 2.8 s | none |
| [2026-11-09T05-27-25](2026-11-09T05-27-25-phase-1a-fixes_agent-page/results.jsonl) | `phase-1a-fixes:agent-page` | 7/7 | 0 | 0 | $0.00036 | 1.9 s / 2.5 s | none |
| [2026-11-09T05-28-14](2026-11-09T05-28-14-phase-1a-fixes_agent-45/results.jsonl) | `phase-1a-fixes:agent-45` | 45/45 | 0 | 0 | $0.00028 | 2.2 s / 3.3 s | none |
| [2026-11-09T11-39-46](2026-11-09T11-39-46-phase-1b_agent-mentions/results.jsonl) | `phase-1b:agent-mentions` | 7/7 | 0 | 0 | $0.00036 | 2.2 s / 2.4 s | none |
| [2026-11-09T11-39-54](2026-11-09T11-39-54-phase-1b_agent-mentions/results.jsonl) | `phase-1b:agent-mentions` | 7/7 | 0 | 0 | $0.00018 | 2.0 s / 2.3 s | none |
| [2026-11-09T11-40-01](2026-11-09T11-40-01-phase-1b_agent-mentions/results.jsonl) | `phase-1b:agent-mentions` | 7/7 | 0 | 0 | $0.00018 | 1.8 s / 2.3 s | none |
| [2026-11-09T11-40-15](2026-11-09T11-40-15-phase-1b_agent-page/results.jsonl) | `phase-1b:agent-page` | 7/7 | 0 | 0 | $0.00021 | 1.7 s / 2.7 s | none |
| [2026-11-09T11-40-56](2026-11-09T11-40-56-phase-1b_agent-45/results.jsonl) | `phase-1b:agent-45` | 44/45 | 0 | 0 | $0.00055 | 2.1 s / 3.5 s | N04 |
| [2026-11-09T11-41-09](2026-11-09T11-41-09-phase-1b_rerun-n04/results.jsonl) | `phase-1b:rerun-n04` | 1/1 | 0 | 0 | $0.00036 | 3.5 s / 3.5 s | none |
