---
name: frontend-design
description: "Create distinctive, production-grade frontend interfaces with high design quality. Use when building web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics — no default purple gradients, no Inter everywhere, no cookie-cutter layouts."
---

# Frontend Design

## Purpose

Generate production-ready HTML/CSS/JS or React components with distinctive typography, creative layouts, and thoughtful animations. Avoid the "AI slop" look — no purple gradients, no Inter/system font defaults, no generic card grids.

## Design Principles

1. **Typography-first**: Choose fonts that match the brand personality. Pair a distinctive display font with a readable body font. Use proper scale (modular or custom).

2. **Color with intention**: Build palettes from a concept, not from Tailwind defaults. Consider: warm vs cool, saturated vs muted, light vs dark. Every color should have a reason.

3. **Layout creativity**: Go beyond the 12-column grid. Use asymmetry, overlapping elements, full-bleed sections, editorial layouts. Let the content dictate the structure.

4. **Motion as communication**: Animations should convey meaning (entrance, feedback, state change), not just decorate. Keep them subtle and purposeful. Respect prefers-reduced-motion.

5. **Whitespace is design**: Don't fill every pixel. Let elements breathe. Generous padding > cramped layouts.

## Anti-Patterns (DO NOT)

- Purple/indigo gradient backgrounds
- Inter or system-ui as the only font
- Generic rounded cards in a 3-column grid
- Placeholder images from unsplash with no relation to content
- "Hero section + features grid + testimonials + CTA" cookie-cutter layouts
- Shadows on everything
- Gradients on every button

## When Building for Probe

### Brand Direction
- **Tone**: Professional but approachable, like a supportive coach
- **Feel**: Clean, modern, confidence-inspiring
- **NOT**: Corporate/sterile, gamified/childish, overly playful

### Specific Guidelines
- Use Chinese-friendly fonts (Noto Sans SC / Source Han Sans for body)
- Lucide icons (consistent, clean)
- Tailwind CSS with custom design tokens
- Subtle micro-interactions on key moments (starting interview, receiving score)
- Skeleton loading states during LLM response
- Typewriter effect for AI responses (conversational feel)

### Color Direction
```
Primary: Slate/Blue spectrum (trust, professionalism)
Accent: Warm amber or teal (energy, growth)
Background: Near-white with subtle warmth
Text: Slate-900 (body), Slate-600 (secondary)
Success: Emerald for good scores
Warning: Amber for areas to improve
```

### Key UI Moments (high polish priority)
1. **面试开始** — Build anticipation, clean transition
2. **AI 提问** — Typewriter reveal, feel like a real person speaking
3. **得分揭晓** — Satisfying score animation (number count-up)
4. **雷达图** — Smooth draw-in animation
5. **分享图生成** — Beautiful card worth sharing on 小红书
