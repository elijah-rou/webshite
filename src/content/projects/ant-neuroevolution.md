---
name: Ant-Neuroevolution
repo: https://github.com/elijah-rou/Ant-Neuroevolution
language: Python
summary: Replicating stigmergic ant foraging with multi-agent neuroevolution.
order: 7
---
A Cornell project testing whether evolved neural networks can learn how ants
forage. Real ants communicate indirectly by leaving pheromone for others to
follow, a behaviour called stigmergy.

It simulates pheromone-dropping ant agents in PyTorch and improves them with an
evolutionary algorithm, with standard reinforcement learning methods tried as
alternatives. No neural network agent came close to a simple pre-programmed
agent, which suggests foraging is hard to train a neural decision-maker for.
