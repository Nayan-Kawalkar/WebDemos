# WebDemos

Two cinematic, scroll-animated small-business websites — plain HTML, CSS and JavaScript,
no build step.

| Site | Folder | What makes it different |
| --- | --- | --- |
| **Cafetoor** — café & juice bar | [`cafetour/`](cafetour) | Video hero that opens from a framed window, horizontal pinned gallery of the room, and a searchable **menu board** with veg / egg / non-veg marks, Hot / Iced price columns and dish photos that open in a large view. |
| **Arco** — barber & grooming studio | [`barbershop/`](barbershop) | The wordmark parts around an **arched doorway** you scroll through, a **“Find your look”** lookbook, stacking service cards that **build your visit** (live time & price total), a light-arch appointment timeline and **day / time booking that writes a WhatsApp message**. |

## Run locally

Each site has a tiny dependency-free preview server (Node 18+):

```bash
cd cafetour && node serve.mjs     # http://localhost:4173
cd barbershop && node serve.mjs   # http://localhost:4174
```

Add a port number to use a different one, e.g. `node serve.mjs 4176`.

Opening `index.html` directly also works, but the local server lets the hero videos seek and loop properly.

## Stack

- [GSAP 3](https://gsap.com/) + ScrollTrigger for animation, [Lenis](https://lenis.darkroom.engineering/) for smooth scrolling — loaded from CDNs.
- Everything degrades: without JavaScript the pages are static, with *reduce motion* turned on there is no smooth scrolling or scrubbing.

## Editing content

- Café menu, prices and dish photos → `cafetour/menu.js`
- Barber services, prices, look photos and booking settings (WhatsApp number, opening hours) → `barbershop/services.js`
- Address, phone and hours → the “Visit” / “Find us” section of each `index.html`

## Before using these for a real business

- **Placeholder content:** names (“Cafetoor”, “Arco”), dishes, services, prices, address, phone, hours and the WhatsApp number (`910000000000`) are all made up.
- **Footage:** the hero videos and section photos are cut from third-party videos (a Kiev Design Online Studio café render and a salon project tour). Get permission or replace them with your own footage.
- **Stand-in photos:** dish photos (`cafetour/assets/menu/`) and look photos (`barbershop/assets/looks/`) are public-domain or CC-licensed stand-ins — see the `CREDITS.md` in each folder. CC BY / CC BY-SA photos must keep their credit line. Replace them with photos of your own dishes and (with permission) your own clients.
