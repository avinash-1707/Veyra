# Capture Test

- **Tool:** Pi Coding Agent (`pi` 0.86.0)
- **Model:** `openai-codex/gpt-5.5` for planning and execution in the verified canary sessions. (This interactive session later selected `openai-codex/gpt-5.6-terra`; each entry records its active model.)
- **Mechanism:** Pi's auto-discovered global extension lifecycle hooks. `before_agent_start` records the raw prompt; `message_end` retains assistant text; `agent_settled` appends the final prompt/response pair to the project log automatically.
- **Configuration/entrypoint:** `~/.pi/agent/extensions/agent-capture.ts` (global auto-discovery entrypoint), which loads `/Users/avinash/code/projects/my-pi/.pi/extensions/agent-capture/index.ts`.
- **Canary logs:**
  - `.agent-logs/20260920_075956_capture-canary-one.md`
  - `.agent-logs/20260920_080018_capture-canary-two.md`
- **What did not work first:** Nothing in this setup. The capture extension was already installed globally; per instruction, I did not recreate it in this project.

## Canary 1 (raw entries)

[LOG_ENTRY type=PROMPT num=1 session=capture-canary-one]
timestamp: 2026-09-20T07:59:56.179Z
model: openai-codex/gpt-5.5

CAPTURE TEST — 8x assignment, Avinash


[LOG_ENTRY type=RESPONSE num=1 session=capture-canary-one]
timestamp: 2026-09-20T08:00:03.737Z
model: openai-codex/gpt-5.5

Ready for the 8x assignment, Avinash.

## Canary 2 (raw entries)

[LOG_ENTRY type=PROMPT num=1 session=capture-canary-two]
timestamp: 2026-09-20T08:00:18.986Z
model: openai-codex/gpt-5.5

CAPTURE TEST — 8x assignment, Avinash


[LOG_ENTRY type=RESPONSE num=1 session=capture-canary-two]
timestamp: 2026-09-20T08:00:30.100Z
model: openai-codex/gpt-5.5

Ready for the CAPTURE TEST — 8x assignment, Avinash.
