---
name: surfsk8s
repo: https://github.com/elijah-rou/surfsk8s
language: Go
summary: Multi-cluster Kubernetes TUI built for fleet scale.
order: 1
---
A terminal UI for Kubernetes that stays fast across many clusters at once. It is
aimed at the point where existing tools slow down: thousands of pods, many
deployments and several kubeconfig contexts open together.

It keeps cluster state in memory from informer streams instead of polling,
renders only the rows on screen, and tags every row with its cluster, so a
unified fleet view is the default. It reads kubeconfig directly; there is no
server, database or sidecar.

The current build is in daily use. It covers:

- context, namespace and resource pickers, with favourites
- typed views for pods, deployments, services and nodes, and generic browsing
  for any discovered resource or CRD
- fuzzy, wildcard, exact and per-column filters, and multi-column sorting
- details, manifest editing, exec, logs, port-forward, scale and restart

Written in Go with client-go, Bubble Tea and Lip Gloss.
