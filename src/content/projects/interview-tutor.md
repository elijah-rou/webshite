---
name: interview-tutor
repo: https://github.com/elijah-rou/interview-tutor
language: Rust
summary: Local algorithm practice catalog and judge with a terminal browser and editor.
order: 5
---
A local practice catalog and judge for algorithm interview problems, built for
Linux.

A Rust CLI keeps the catalog and your progress in a local database. A terminal
browser lists the problem sets, and opening a problem starts an embedded Neovim
editor: one key runs the tests, another submits and records an attempt.
Solutions can be written in Python or Rust.

The catalog has 98 problems across several sets, including the Blind 75. An
optional interviewer can talk through a problem, using Pi by default or Codex.
