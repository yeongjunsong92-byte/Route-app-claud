# Route App Project Instructions

## Design System & UI/UX
This project follows the **UI/UX Pro Max** design intelligence system. Before making any UI changes, creating new pages, or refactoring components, always refer to the project's design system documentation.

### Core Principles
- **Style**: Aurora UI (Modern, vibrant, immersive)
- **Primary Colors**: #E11D48 (Rose), #2563EB (Engagement Blue)
- **Typography**: Plus Jakarta Sans
- **Accessibility**: WCAG AA (Contrast 4.5:1 minimum)

### Usage Instructions
1.  **Reference Master Rules**: Read `design-system/route-app/MASTER.md` for global design tokens, spacing, and patterns.
2.  **Check Page Overrides**: Check `design-system/route-app/pages/[page-name].md` for specific page rules.
3.  **Use Search Tool**: If a design decision is needed for a new domain, use the search tool:
    ```bash
    python3 /home/ubuntu/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
    ```
4.  **GSAP Motion**: Follow the motion guidelines in the design system for transitions.

### Pre-Delivery Checklist
- [ ] No emojis as icons (use SVG: Heroicons/Lucide).
- [ ] `cursor-pointer` on all clickable elements.
- [ ] Hover states with smooth transitions (150-300ms).
- [ ] Responsive check: 375px, 768px, 1024px, 1440px.
