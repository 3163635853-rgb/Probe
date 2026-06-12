---
name: ui-ux-pro-max
description: "UI/UX design intelligence. 50+ styles, 97 color palettes, 57 font pairings, 99 UX guidelines, 25 chart types across 9 stacks (React, Next.js, Vue, Svelte, SwiftUI, React Native, Flutter, Tailwind, shadcn/ui). Use when building components, reviewing UI, choosing palettes, or implementing animations. Topics: glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, accessibility, animation, layout, typography, spacing, hover, shadow, gradient."
---

# UI/UX Pro Max - Design Intelligence

Comprehensive design guide for web and mobile applications.

## When to Apply

Reference these guidelines when:
- Designing new UI components or pages
- Choosing color palettes and typography
- Reviewing code for UX issues
- Building landing pages or dashboards
- Implementing accessibility requirements
- Adding animations and interactions

## Rule Categories by Priority

| Priority | Category | Impact |
|----------|----------|--------|
| 1 | Accessibility | CRITICAL |
| 2 | Touch & Interaction | CRITICAL |
| 3 | Performance | HIGH |
| 4 | Layout & Responsive | HIGH |
| 5 | Typography & Color | MEDIUM |
| 6 | Animation | MEDIUM |
| 7 | Style Selection | MEDIUM |
| 8 | Charts & Data | LOW |

## Quick Reference

### 1. Accessibility (CRITICAL)
- `color-contrast` - Minimum 4.5:1 ratio for normal text
- `focus-states` - Visible focus rings on interactive elements
- `alt-text` - Descriptive alt text for meaningful images
- `aria-labels` - aria-label for icon-only buttons
- `keyboard-nav` - Tab order matches visual order
- `form-labels` - Use label with for attribute

### 2. Touch & Interaction (CRITICAL)
- `touch-target-size` - Minimum 44x44px touch targets
- `hover-vs-tap` - Use click/tap for primary interactions
- `loading-buttons` - Disable button during async operations
- `error-feedback` - Clear error messages near problem
- `cursor-pointer` - Add cursor-pointer to clickable elements

### 3. Performance (HIGH)
- `image-optimization` - Use WebP, srcset, lazy loading
- `reduced-motion` - Check prefers-reduced-motion
- `content-jumping` - Reserve space for async content

### 4. Layout & Responsive (HIGH)
- `viewport-meta` - width=device-width initial-scale=1
- `readable-font-size` - Minimum 16px body text on mobile
- `horizontal-scroll` - Ensure content fits viewport width
- `z-index-management` - Define z-index scale (10, 20, 30, 50)

### 5. Typography & Color (MEDIUM)
- `line-height` - Use 1.5-1.75 for body text
- `line-length` - Limit to 65-75 characters per line
- `font-pairing` - Match heading/body font personalities

### 6. Animation (MEDIUM)
- `duration-timing` - Use 150-300ms for micro-interactions
- `transform-performance` - Use transform/opacity, not width/height
- `loading-states` - Skeleton screens or spinners
- Default animation OFF unless requested
- Use compositor-friendly props (transform, opacity)

### 7. Style Selection (MEDIUM)
- `style-match` - Match style to product type
- `consistency` - Use same style across all pages
- `no-emoji-icons` - Use SVG icons (Lucide, Heroicons), not emojis

## Common Rules for Professional UI

### Icons & Visual Elements

| Rule | Do | Don't |
|------|-----|-------|
| No emoji icons | Use SVG icons (Lucide, Heroicons) | Use emojis as UI icons |
| Stable hover | Use color/opacity transitions | Use scale that shifts layout |
| Consistent sizing | Fixed viewBox 24x24, w-6 h-6 | Mix different icon sizes |

### Interaction & Cursor

| Rule | Do | Don't |
|------|-----|-------|
| Cursor pointer | Add to all clickable elements | Leave default on interactive |
| Hover feedback | Color, shadow, or border change | No indication of interactivity |
| Smooth transitions | transition-colors duration-200 | Instant or >500ms |

### Light/Dark Mode

| Rule | Do | Don't |
|------|-----|-------|
| Glass card light | bg-white/80 or higher | bg-white/10 (too transparent) |
| Text contrast | #0F172A (slate-900) for text | #94A3B8 for body text |
| Border visibility | border-gray-200 in light | border-white/10 (invisible) |

### Layout & Spacing

| Rule | Do | Don't |
|------|-----|-------|
| Content padding | Account for fixed navbar | Let content hide behind nav |
| Consistent width | Same max-w-6xl or max-w-7xl | Mix container widths |
| Responsive | Test 375px, 768px, 1024px, 1440px | Only desktop |

## Pre-Delivery Checklist

### Visual Quality
- [ ] No emojis as icons (use SVG)
- [ ] Icons from consistent set (Lucide for this project)
- [ ] Hover states don't cause layout shift
- [ ] Colors from design system, not random

### Interaction
- [ ] All clickable elements have cursor-pointer
- [ ] Transitions smooth (150-300ms)
- [ ] Focus states visible for keyboard nav

### Accessibility
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Color not the only indicator
- [ ] prefers-reduced-motion respected

### Layout
- [ ] No horizontal scroll on mobile
- [ ] Responsive at all breakpoints
- [ ] No content behind fixed elements

## Available Styles

glassmorphism, claymorphism, minimalism, brutalism, neumorphism, bento grid, dark mode, skeuomorphism, flat design, material design, aurora, gradient mesh, frosted glass, neon glow, retro/vintage, cyberpunk, organic/nature, geometric, editorial, swiss/international

## Recommended for Probe Project

**Style**: Minimalism + subtle glassmorphism accents
**Palette**: Professional blue/slate with warm accent
**Typography**: Inter (body) + font with Chinese support
**Icons**: Lucide React
**Components**: shadcn/ui as base
