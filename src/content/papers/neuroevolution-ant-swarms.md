---
title: Efficacy of Deep Neuroevolution for Emergent Control of Multi-Agent Swarms
authors: [Russell Bingham, Elijah Roussos, Darren Midkiff, Everett Key]
context: Cornell Tech, CS6680 Bio-Inspired Multi-Agent Systems
year: 2021
pdf: /papers/neuroevolution-ant-swarms.pdf
project: ant-neuroevolution
demo:
  src: /papers/right-biased-ants.mp4
  width: 824
  height: 714
  caption: >-
    Evolved agents in the first, flawed environment, where food (green) spawned
    only on the right. The ants (red) head straight there and carry it back to the
    nest (yellow), laying pheromone (blue) on the way.
---
A functional evolutionary algorithm system for improving the behavior of
pheromone-dropping "ant" agents in simulation is presented. Given a semi-degenerate
set of initial conditions with biased food locations, the agents learn to go to
locations where there will likely be food, but when food is distributed truly
randomly the genetic algorithm is unable to find a solution. Traditional
backpropagation-based RL methods are tested as alternate training options, but no
neural network agent is able to approach the performance of a simple pre-programmed
agent, suggesting that the foraging problem is fundamentally difficult to train a
neural network decision agent for.
