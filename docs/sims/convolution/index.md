---
title: Convolution
description: Interactive visualization demonstrating convolution as a measure of overlap between functions using a square and triangle example.
image: /sims/convolution/convolution.png
og:image: /sims/convolution/convolution.png
social:
   cards: false
quality_score: 60
hide:
  - toc
---
# Understanding Convolution: An Interactive Lesson

<iframe src="main.html" width="470" height="267" noscroll="true" style="overflow: hidden;"></iframe>

[Edit this MicroSim](https://editor.p5js.org/dmccreary/sketches/zmX1mgsv3)

## Learning Objectives

By the end of this lesson, students will be able to:

1. Understand convolution as a measure of overlap between two functions
2. Visualize how the convolution operation works geometrically
3. Connect the geometric interpretation to the mathematical definition
4. Apply this understanding to basic signal processing concepts

## Prerequisites

- Basic understanding of functions
- Familiarity with coordinate systems
- Understanding of area calculations

## Lesson Plan

### Part 1: Introduction

We define convolution informally as a way to measure how much two functions overlap as one slides over the other.

There are many real-world applications of convolutions

- Image blurring in photo editing
- Audio echo effects
- Signal filtering in communications
- Data smoothing in statistics

### Part 2: Geometric Understanding

#### Interactive Simulation Exploration

1. Introduce the three regions of the simulation:

- Left: Square function f(x) (blue)
- Middle: Triangle function g(x) (red)
- Right: Convolution result (f * g)(x) (purple)

2. Student Activities:

Move the slider slowly from left to right, observing:

- When does overlap begin?
- When is overlap maximum?
- How does the overlap change throughout?

Key Observations:

- The height of the purple triangle represents the area of overlap
- Maximum overlap occurs when the square aligns with the triangle's peak
- The result is symmetric (why?)

### Part 3: Mathematical Connection

The convolution formula:

$$
(f * g)(x) = \int f(\tau)g(x-\tau)d\tau
$$

Connect simulation to formula:
1. f(τ) is our moving square function
2. g(x-τ) is our stationary triangle function
3. The integral (∫) represents the area of overlap
4. The slider position represents the x in our formula
5. The height of the purple triangle represents (f * g)(x) at that x position

If we want to explicitly show the limits of integration (typically from -∞ to ∞ for continuous convolution), we would write:

$$
(f * g)(x) = \int_{-\infty}^{\infty} f(\tau)g(x-\tau)d\tau
$$

### Part 4: Practice and Discussion (10 minutes)

Student Exercises:

1. Predict the shape of the convolution result before sliding:
   - Where will it start rising?
   - Where will it peak?
   - Where will it return to zero?

2. Discussion Questions:
   - Why is the result symmetric?
   - What determines the maximum height of the result?
   - How would the result change if we used two squares instead?
   - How would it change with two triangles?

## Assessment Questions

1. What determines the height of the purple triangle at any given slider position?
2. Why does the convolution result reach its maximum when the square is centered on the triangle?
3. If we made the blue square wider, how would that affect the purple result?
4. How does this geometric interpretation help understand the convolution formula?

## Extended Learning

Challenge students to think about:

1. How this relates to digital filters in signal processing
2. Why convolution is useful for image blurring
3. How changing the shapes of f(x) and g(x) would affect the result
4. The relationship between convolution and correlation

## Common Misconceptions to Address

1. The height of the result is NOT the height of overlap, but the AREA of overlap
2. Convolution is NOT multiplication at a point, but integration of product over all overlapping points
3. The result shape depends on BOTH input shapes, not just one

## Homework Suggestions

1. Sketch predicted convolution results for different function pairs
2. Find real-world examples of convolution in signal processing
3. Write a brief explanation of why the convolution result is smooth even with a square input

## Additional Resources

- Signal processing textbook chapters on convolution
- Online visualizations of 2D convolution for image processing
- Audio processing examples using convolution for reverb effects