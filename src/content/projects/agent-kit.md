---
name: agent-kit
repo: https://github.com/elijah-rou/agent-kit
language: TypeScript
summary: Shared instructions, skills and extensions for the Pi, Codex and Claude Code agents.
order: 2
---
Instructions, skills, Pi extensions and Claude Code mods shared by three coding
agents: Pi, Codex and Claude Code. A separate bootstrap repository pins a commit
of it and links it for whichever agents a machine uses; model and provider
settings live there.

The instructions set a default for what agents may do on their own, such as
local work and `agent/*` branches and pull requests in repositories you own, and
ask for planning only at decisions that are hard to reverse. Merging happens only
in modes you start for a run, with a fresh verifier recording a verdict on each
pull request and GitHub rulesets as the backstop.

The repository also holds the `agentic` CLI, which manages those rulesets and
tracks changes in adapted upstream skills.
