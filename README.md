# RideLoop — Motorcycle Route Planner

## What is RideLoop?

RideLoop is a free, no-account web app for motorcyclists who want a great ride without spending hours planning it. You enter a starting point, pick your preferences, and RideLoop generates a scenic round-trip loop — then lets you send it straight to Google Maps in one tap. Works with Android Auto and Apple CarPlay.

## How it works

1. **Enter a starting point** — type any address or use your GPS location. Google Places autocomplete fills in as you type.
2. **Set your preferences** — choose ride duration, road type (twisties, highways, or mixed), scenery style, direction, and roads to avoid (tolls, ferries, unpaved).
3. **Generate your loop** — RideLoop builds a round-trip route and draws it on an interactive map.
4. **Export to Google Maps** — one tap sends the full route (with waypoints) to Google Maps for turn-by-turn navigation.

You can also set an optional end point if you don't want a loop.

## Key features

- Round-trip loop generation from any starting point
- Optional custom end point
- Preference filters: duration, road style, scenery, direction, avoid options
- Points of Interest along the route (monuments, museums, parks, viewpoints) with photos, ratings, and website links
- Elevation profile chart showing the terrain over the full route with low/high elevation stats
- Live weather summary at the start location (condition, temperature, feels-like, wind speed)
- Active filter tags shown after generating so you always know what settings were used
- Share Route button (Web Share API with clipboard fallback)
- Google Places autocomplete on all location inputs
- Fully responsive, works on mobile

## Target audience

Motorcyclists of all experience levels who want spontaneous, scenic rides. Ideal for weekend riders, touring enthusiasts, and anyone who loves discovering new roads.

## Tone & personality

Adventurous, direct, no-nonsense. RideLoop is for people who want to ride, not plan. The app gets out of the way fast.

Tagline: **"Your next great ride starts here."**

---

## Color scheme

| Role | Name | Hex |
|---|---|---|
| Primary accent | Orange | `#FF6B00` |
| Accent dark (hover) | Orange Dark | `#D95A00` |
| Accent light | Orange Light | `#FF8C33` |
| Background | White | `#FFFFFF` |
| Surface | Light grey | `#F7F7F7` |
| Hero / dark sections | Near-black | `#1A1A1A` |
| Dark mid | Charcoal | `#2D2D2D` |
| Body text | Near-black | `#1A1A1A` |
| Muted text | Medium grey | `#6B6B6B` |
| Border | Light grey | `#E2E2E2` |
| Route line on map | Orange | `#FF6B00` |
| Google Maps button | Google Blue | `#4285F4` |

**Overall feel:** Dark hero section with a warm orange CTA, clean white content sections below. Bold, high-contrast, built for outdoor use.

---

## Typography

**Primary font:** Inter (Google Fonts) — used for all body text, UI labels, buttons, and headings.
Fallback stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`

| Scale | Size | Usage |
|---|---|---|
| sm | 14px (0.875rem) | Hints, labels, fine print |
| base | 16px (1rem) | Body text, form inputs |
| lg | 18px (1.125rem) | Section subtitles, card text |
| xl | 20px (1.25rem) | Small headings |
| 2xl | 24px (1.5rem) | Section headings |
| 3xl | 32px (2rem) | Page headings |

**Style:** Clean, modern sans-serif. No decorative or display fonts. Weight varies from 400 (body) to 700 (headings and CTAs). The overall typographic feel is minimal and functional — legibility first, especially on small screens.

---

## Tech stack (context only)

- WordPress theme (PHP templates)
- Vanilla JavaScript (no framework)
- Google Maps JavaScript API (Directions, Places, Elevation)
- Open-Meteo API for weather (free, no API key required)
- CSS custom properties
