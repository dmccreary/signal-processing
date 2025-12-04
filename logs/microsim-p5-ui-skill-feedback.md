# MicroSim P5 Skill UI Feedback Log

**Date:** 2025-01-25
**Model:** Claude Opus 4.5 (claude-opus-4-5-20251101)
**Session:** Creating Complex Plane and Euler's Formula Explorer MicroSims

## Summary

This session involved creating two MicroSims for the Signal Processing textbook, with user refinements that revealed improvements needed in the microsim-p5 skill.

## MicroSims Created

### 1. Complex Plane (`/docs/sims/complex-plane/`)
- Visualizes complex numbers in rectangular and polar forms
- Interactive sliders for real and imaginary parts
- Shows magnitude, phase, projections, and right triangle geometry
- Color scheme: Blue (real axis), Red (imaginary axis), Green (vector)

### 2. Euler's Formula Explorer (`/docs/sims/euler-formula-explorer/`)
- Demonstrates e^(iθ) = cos(θ) + i·sin(θ)
- Split layout: unit circle (left) and sine/cosine traces (right)
- Animation with Play/Pause, angle slider, speed control, Reset
- Superscript rendering for exponent in title

## User Manual Edits Observed

The following patterns were identified from user's manual corrections:

| Issue | Original Generated Code | User's Correction |
|-------|------------------------|-------------------|
| Drawing area border | `noStroke(); rect(...); stroke('silver'); line(...)` | `stroke('silver'); rect(...)` |
| Title position | `canvasWidth/2` (centered) | `canvasWidth * 0.35` (left offset) |
| Title drawing order | Before grid/axes | After grid/axes |
| Axis labels | "Re", "Im" | "Real Axis", "Imaginary Axis" |
| Panel corner radius | 5 | 10 |
| sliderLeftMargin | 240 | 230 |
| Panel heights | 65px | 75px |

## Key Insight: Title Positioning

When a MicroSim has annotation panels on the right side OR a vertical axis with labels, the title must be offset to the left to avoid overlap. The user corrected `canvasWidth/2` to `canvasWidth * 0.35` so the title wouldn't cover the imaginary axis label.

## Skill Updates Applied

Updated `/Users/dan/.claude/skills/microsim-p5/skill.md` with:

### 1. New "Drawing Order" Section
```
1. Background areas first
2. Grid lines
3. Axes
4. Title (AFTER grid/axes)
5. Main visualization
6. Annotation panels
7. Control labels
```

### 2. Updated Canvas Pattern
```javascript
// Drawing area (light blue background with silver border)
fill('aliceblue');
stroke('silver');  // Border on rect itself
rect(0, 0, canvasWidth, drawHeight);

// Control area (white background)
fill('white');
noStroke();
rect(0, drawHeight, canvasWidth, controlHeight);
```

### 3. Title Positioning Guidelines
- Simple MicroSims: center at `canvasWidth/2`
- With right-side panels/axis labels: offset to `canvasWidth * 0.35`

### 4. Updated Default Values
- `sliderLeftMargin`: 105 → 140 (default), 200-240 (when buttons present)
- Title size: 36px → 24px

### 5. New Axis Label Guidance
- Use full descriptive labels ("Real Axis") not abbreviations ("Re")

### 6. New Annotation Panel Styling
- Rounded corners: radius 10
- Background: `fill(255, 255, 255, 230)`
- Border: `stroke(200)`
- Generous vertical spacing: 20px per line

## Files Modified

### Created
- `docs/sims/complex-plane/complex-plane.js`
- `docs/sims/complex-plane/main.html`
- `docs/sims/complex-plane/index.md`
- `docs/sims/complex-plane/metadata.json`
- `docs/sims/euler-formula-explorer/euler-formula-explorer.js`
- `docs/sims/euler-formula-explorer/main.html`
- `docs/sims/euler-formula-explorer/index.md`
- `docs/sims/euler-formula-explorer/metadata.json`

### Updated
- `mkdocs.yml` - Added both MicroSims to navigation
- `docs/chapters/01-mathematical-foundations/index.md` - Added iframes, fixed broken iframe tag
- `/Users/dan/.claude/skills/microsim-p5/skill.md` - Incorporated learnings

## Lessons for Future MicroSim Generation

1. **Always consider what elements exist on the right side** before centering the title
2. **Draw title after axes/grid** to prevent overwriting
3. **Use stroke on rect** instead of separate line for cleaner borders
4. **Be generous with spacing** - panels and controls need room
5. **Use full descriptive labels** for educational clarity
6. **sliderLeftMargin must account for all controls** - buttons, labels, values

## Recommendations for Skill Improvement

Consider adding:
- Template for split-layout MicroSims (like Euler explorer)
- Superscript text rendering helper function
- Standard annotation panel component
- Automatic sliderLeftMargin calculation based on control count
