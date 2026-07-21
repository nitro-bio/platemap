# Nitro Platemap

![CleanShot 2025-01-28 at 14 52 05@2x](https://github.com/user-attachments/assets/92be9bcd-1069-40d0-a73e-b69512d715fd)

## As seen on

- [Nitro Bio's BioGraphics](https://biographics.nitro.bio/): Open License Scientific Figure builder
- [Nitro Bio's PlatePlanner](https://plateplanner.nitro.bio/): build beautiful platemaps

## React Platemap Component

Version 2 models a plate as an ordered stack of independently editable layers.
The reducer is the canonical state engine; both components use its grouped
controlled objects.

```tsx
import {
  Plate,
  PlateControls,
  usePlateReducer,
} from "@nitro-bio/platemap";
import "@nitro-bio/platemap/dist/nitro-platemap.css";

export function PlateEditor() {
  const reducer = usePlateReducer({ initialPlateSize: 96 });

  return (
    <>
      <Plate {...reducer} />
      <PlateControls {...reducer} />
    </>
  );
}
```

`layers` is always non-empty and stored in visual top-to-bottom order. Flat
mode renders and edits only `activeLayerId`; isometric mode renders the complete
read-only stack. Selection and exclusions remain global.

`PlateControls` covers layer add, activation, inline rename, accessible move,
delete confirmation, flat/isometric focus, tidy per-layer CSV, and versioned
JSON documents. Styling is controlled by semantic `--platemap-*` CSS variables
on any ancestor.

The durable JSON shape has `schemaVersion: 1`, `plateSize`, `excludedWells`,
and `layers`. It intentionally omits selection, active IDs, and view mode. Use
`parsePlateState` to accept either this document or a validated legacy flat
state; legacy IDs are regenerated.

Tidy CSV requires `Well` and `Annotation`, optionally accepts
`Annotation Key` and `Color`, and treats other columns as flat primitive
metadata. The former plate-shaped matrix is export-only and is not accepted by
the layer importer.

The supported performance target is eight layers of 1,536 wells in isometric
mode. Rendering remains DOM/CSS based and respects reduced motion.

[Documentation](https://docs.nitro.bio/Platemap) ·
[Layer specification](docs/plate-map-layers-spec.md)
