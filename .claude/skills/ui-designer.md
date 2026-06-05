---
name: ui-designer
description: Extract design systems from reference UI images and generate implementation-ready UI design prompts. Use when users provide UI screenshots/mockups and want to create consistent designs, generate design systems, or build MVP UIs matching reference aesthetics.
---

# UI Designer

## Overview

This skill enables systematic extraction of design systems from reference UI images through a multi-step workflow: analyze visual patterns → generate design system documentation → create PRD → produce implementation-ready UI prompts.

## When to Use

- User provides UI screenshots, mockups, or design references
- Need to extract color palettes, typography, spacing from existing designs
- Want to generate design system documentation from visual examples
- Building MVP UI that should match reference aesthetics
- Creating multiple UI variations following consistent design principles

## Workflow

### Step 1: Gather Inputs

Request from user:
- **Reference images directory**: Path to folder containing UI screenshots/mockups
- **Project idea file**: Document describing the product concept and goals

### Step 2: Extract Design System from Images

Analyze reference images for:
- Color palettes (primary, secondary, accent, functional colors)
- Typography (font families, sizes, weights, line heights)
- Component styles (buttons, cards, inputs, icons)
- Spacing system
- Animations/transitions patterns
- Dark mode variants if present

**Output**: Complete design system markdown
**Save to**: `documents/designs/{image_dir_name}_design_system.md`

### Step 3: Generate MVP PRD (if not provided)

Guide through:
- Elevator pitch, problem statement, target audience
- Unique selling proposition
- Features list with user stories
- UX/UI considerations per screen

### Step 4: Compose Final UI Implementation Prompt

Combine design system and PRD into implementation-ready prompt containing:
- Design aesthetics principles
- Project-specific color/typography guidelines
- App overview and feature requirements
- Implementation tasks (multiple UI variations, component structure)

**Save to**: `documents/ux-design/{idea_file_name}_design_prompt_{timestamp}.md`

### Step 5: Implement UI

Target stack: React + Tailwind CSS + Lucide icons
- Create multiple design variations (3 for mobile, 2 for web)
- Organize as separate components
- Aggregate in showcase page

## Best Practices

### Image Analysis
- Read all images before starting analysis
- Look for patterns across multiple screens
- Use specific values (hex codes, px sizes) not generic descriptions
- Include variants (hover states, disabled states)

### Output Organization
- Save design system with descriptive filename
- Save final prompt with timestamp for version tracking
- Keep all outputs in `documents/` directory
