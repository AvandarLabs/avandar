# Chat SQL table aliases

Model-facing chat prompts use short workspace-scoped names (`t0`, `t1`, …)
instead of dataset UUIDs. DuckDB still addresses tables by dataset id. Both
SQL generators (`supabase/functions/chat/` and the offline WebLLM pipeline)
share `SqlTableAlias` in `shared/models/chat/SqlTableAlias/`.

Assignment is stable: datasets are sorted by id, then numbered. The compact
schema line is `- t3: Cholera cases (case_id, …)`. After the model returns
SQL, `SqlTableAlias.applyToSql` rewrites aliases to quoted dataset ids.

The schema-block budget is in characters. `@mlc-ai/web-llm@0.2.84` has no
encode API. Qwen2.5 tokenizes a 36-character UUID at 32.1 tokens (~1.12
chars/token on UUIDs). Recheck `CompletionUsage.prompt_tokens` when adding a
model.

Offline inference uses `chatOpts.context_window_size = 8192`. For the default
Qwen2.5-1.5B, that KV cache is 112 MiB above web-llm's 4096 default (28
layers × 2 KV heads × 128 head_dim × 2 bytes × 4096 extra tokens).
