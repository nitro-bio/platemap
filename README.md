# Nitro Platemap

![CleanShot 2025-01-28 at 14 52 05@2x](https://github.com/user-attachments/assets/92be9bcd-1069-40d0-a73e-b69512d715fd)

## As seen on

- [Nitro Bio's BioGraphics](https://biographics.nitro.bio/): Open License Scientific Figure builder
- [Nitro Bio's PlatePlanner](https://plateplanner.nitro.bio/): build beautiful platemaps

## React Platemap Component

[Documentation](https://docs.nitro.bio/Platemap)

Version 2 provides React 19-compatible accessible plate-grid primitives for
24, 48, 96, 384, and 1536-well layouts. Import the package CSS once in the
consumer entry point:

```tsx
import { Plate, rangeToWells, usePlateReducer } from "@nitro-bio/platemap";
import "@nitro-bio/platemap/dist/nitro-platemap.css";
```

The package deliberately owns coordinate conversion, selection helpers,
validated pure state transitions, deterministic export helpers, and grid
rendering. Persistence, history, billing, and application dialogs belong in
the consuming application.
