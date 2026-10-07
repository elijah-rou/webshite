---
name: hivemind
repo: https://github.com/elijah-rou/hivemind
language: Zig
summary: Deterministic workload-orchestration prototype for serverless platforms.
order: 3
---
A prototype of a deterministic workload-orchestration system for running
serverless platforms. Each component is written in the language that suits it:

- `core/`: the control plane in Zig, with consensus, scheduling, persistence,
  gossip and simulation testing
- `worker/`: the node agent in Rust, covering runtimes, GPU and resource
  accounting, secrets and volumes
- `api/`: a REST and dashboard gateway in Go
- `bench/`: benchmark tooling in Go

A shared set of deterministic wire fixtures checks that the Zig, Rust and Go
parts agree on the protocol. The live deployment path is prepared but has not
been run.
