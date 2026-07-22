# Plate Map Layers Specification

## Status

- Target release: `@nitro-bio/platemap` 2.0.0
- Implementation branch: `codex/plate-map-layers`
- Base branch: `codex/modernization-v2`
- Status: ready for implementation

## Summary

Replace the flat annotation collection with ordered, independently editable plate-map layers. In flat mode, the plate displays and edits only the active layer. A read-only layers view displays every layer as an exploded stack of plate maps and lets the user cycle or click through the stack to change the active layer.

The library remains controlled through a canonical `usePlateReducer` state engine. `Plate` and a new `PlateControls` component receive the reducer's grouped `plateState` and `plateActions` objects. `PlateControls` provides the opinionated, shadcn-style reference UI for the complete layer lifecycle and file import/export, while visual customization is exposed through semantic CSS variables and a root `className`.

## Goals

- Give every annotation exactly one layer owner.
- Support creating, activating, renaming, reordering, and deleting layers.
- Make the active layer the sole annotation layer displayed and edited in flat mode.
- Provide a read-only layers view of the complete ordered layer stack.
- Preserve a global well selection while switching layers and views.
- Support simple per-layer CSV interchange and lossless, versioned JSON documents.
- Provide a validated migration path from the v2 flat `PlateState` shape.
- Keep the core UI accessible, dependency-light, and customizable with semantic CSS variables.

## Non-goals

- Backward-compatible v2 component props or flat annotation state.
- A written consumer migration guide for the unreleased flat API.
- Assigning one annotation object to multiple layers.
- Layer visibility or hidden-layer state.
- Per-layer well selections.
- Editing, well selection, or annotation mutation in layers view.
- Drag-and-drop layer reordering; accessible move buttons are sufficient for v1.
- User-defined ordering of annotations within a layer.
- Canvas, WebGL, or rasterized plate rendering.
- A hard maximum layer count. Eight layers is the supported performance target, not a reducer-enforced limit.
- Supporting the legacy plate-shaped CSV matrix format in the new importer.
- Distinguishing absent CSV metadata from an intentional empty string.

## Terminology and Ordering

- A **layer** is a named collection of well annotations.
- The **active layer** is the layer shown and edited in flat mode and focused in layers view.
- `layers` is stored in visual top-to-bottom order. `layers[0]` is the top layer.
- New layers are inserted at index `0`, become active immediately, and appear at the top of `PlateControls`.
- Reordering changes the array order and the order of planes in the layers stack.
- Annotation order within a layer is stable array/insertion order.

## Public Data Model

The exact declarations may be adjusted for TypeScript ergonomics, but the public model must be equivalent to:

```ts
export type PlateViewMode = "flat" | "layers";

export interface PlateLayer<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  id: string; // generated UUID
  name: string;
  annotations: WellAnnotation<WellMetaT>[];
}

export interface PlateState<
  WellMetaT extends Record<string, unknown> = AnnotationMetadata,
> {
  plateSize: PlateSize;
  layers: PlateLayer<WellMetaT>[]; // top-to-bottom; never empty
  activeLayerId: string;
  activeWellAnnotationId: string | null;
  selection: PlateSelection | null;
  excludedWells: number[];
  viewMode: PlateViewMode;
}
```

### Identity and validation invariants

- Layer IDs and annotation IDs are UUIDs and globally unique across the complete plate state.
- A layer name must contain at least one non-whitespace character. Duplicate names are allowed.
- Every plate has at least one layer. Deleting the final layer is disabled and rejected by the reducer.
- `activeLayerId` always resolves to an existing layer.
- `activeWellAnnotationId`, when non-null, resolves to an annotation in the active layer.
- Annotation well indices, excluded wells, and selected wells must be integer indices within the current plate size.
- Invalid initialization, replacement state, or import data fails with a descriptive validation error; it is not silently repaired.
- `usePlateReducer` accepts an optional `generateId: () => string` for tests and non-browser environments. Its default is `crypto.randomUUID()`. Custom factories must return valid UUIDs.

## Reducer and Controlled Component API

`usePlateReducer` is the canonical and documented state engine. It owns all layer transitions and invariants. `Plate` and `PlateControls` expose only the grouped integration form:

```tsx
const { plateState, plateActions } = usePlateReducer({
  initialPlateSize: 96,
});

<Plate
  plateState={plateState}
  plateActions={plateActions}
  className="..."
/>

<PlateControls
  plateState={plateState}
  plateActions={plateActions}
  className="..."
/>
```

Advanced consumers may construct compatible controlled objects themselves, but there is no second individual-value/callback prop form.

Existing non-state configuration such as selection tolerance, additive selection behavior, and accessible labels may remain direct `Plate` props.

### Initialization

- `initialLayers` replaces `initialWellAnnotations` and `initialCSV`.
- If `initialLayers` is omitted, the reducer creates one empty layer named `Layer 1` and makes it active.
- An explicitly supplied empty layer array is invalid rather than interpreted as “use a default.”
- Initial state is validated using the same invariants as replacement/import state.

### Required actions

`PlateActions` must cover at least:

- `addLayer(name?)`
- `renameLayer(layerId, name)`
- `deleteLayer(layerId)`
- `moveLayer(layerId, direction | targetIndex)`
- `setActiveLayer(layerId)`
- `setLayerAnnotations(layerId, annotations)`
- `setActiveWellAnnotation(annotationId | null)`
- `setPlateSize(size)`
- existing selection and excluded-well operations
- `setViewMode(mode)`
- validated `replacePlateState(state)`
- CSV and JSON import transitions as appropriate for the implementation

The general annotation action deliberately accepts a layer ID so programmatic consumers may edit any layer. The bundled UI only exposes annotation editing for the active layer.

Remove the unvalidated `setPlateState` escape hatch. `replacePlateState` validates its input before committing it.

### Reducer behavior

- Adding a layer inserts it at index `0`, names it with the smallest available default `Layer N` when no name is supplied, and makes it active.
- Default names are not renumbered when a layer is deleted. Custom names are never rewritten automatically.
- Switching active layers resets `activeWellAnnotationId` to `null` and preserves global well selection.
- Deleting the active layer activates the nearest remaining layer and resets the active annotation.
- Deleting a non-active layer preserves the active layer by ID.
- Reordering never changes the active layer.
- Shrinking the plate removes out-of-range indices from annotations, exclusions, and selection. Annotation objects that end with an empty `wells` array remain in their layer.
- Expanding the plate leaves existing data unchanged.

## Flat Plate View

- Flat mode renders annotations from the active layer only.
- Non-active layers are never composited into the flat plate.
- The plate retains the current accessible well, row, column, click, keyboard, and drag-selection behavior.
- Well selection and excluded wells are global and do not change when the active layer changes.
- Annotation mutation in the reference UI targets the active layer only.

### Multiple annotations on one well

- For one to four annotations on the active layer, preserve the current equal-width segmented rendering in stable annotation array order.
- For five or more annotations, render exactly four segments:
  1. the first annotation,
  2. the second annotation,
  3. the third annotation,
  4. an overflow segment labeled `+N`, where `N` is the number of omitted annotations.
- The overflow segment uses a pure white background with dark text in light mode and a pure black background with light text in dark mode.
- Accessible well text must announce every annotation, not only the three visible colors, and must communicate the overflow count without duplicating labels.

## Layers View

Layers view is a read-only overview made from the same DOM-based plate-map rendering, transformed with CSS. It must work for every existing plate size, including the performance target of eight 1,536-well layers.

### Presentation

- Render every layer as a separate tilted plate-map plane in array order.
- Every plane shows its wells, annotation rendering, global selection, exclusions, and layer name.
- Do not show row or column coordinate headers on the planes.
- The complete stack remains present while cycling.
- The active plane occupies the front-left position. Remaining planes fan evenly to the right and upward in cyclic stored order, wrapping from the final layer back to the first.
- Changing focus rotates the circular presentation without mutating stored layer order, raises and emphasizes the new active plane, and keeps every plane available.
- CSS transitions animate discrete focus changes and must respect `prefers-reduced-motion`.
- The implementation uses React DOM and CSS transforms only; no canvas or WebGL.

### Interaction

- Wells in layers view are read-only: they cannot modify selection or annotations.
- Previous and next controls cycle through layers without terminal disabled states, wrapping in both directions.
- Horizontal trackpad scrolling and left/right arrow keys provide the same circular navigation while the stack is focused.
- Cycling changes `activeLayerId`; no separate focused-layer state is required.
- Clicking a layer plane also makes that layer active.
- Entering or leaving layers view preserves the active layer and global selection.
- Returning to flat mode displays the newly active layer and permits normal editing.

## `PlateControls`

Export a single opinionated, customizable `PlateControls` component. Do not export its internal rows, buttons, or circular navigation as public primitives in v1.

### Props and customization

- Required: grouped `plateState` and `plateActions`.
- Optional: a standard root `className` for consumer layout placement.
- Internal visual customization is CSS-variable-only; do not expose a typed `classNames` slot map.
- Use native React/HTML controls and the project's CSS variables. Do not add a component-library or drag-and-drop dependency.
- Introduce documented semantic CSS variables for control backgrounds, borders, text, active states, destructive states, stack depth/offset, focus treatment, and overflow-segment colors.

### Layer lifecycle UI

- List layers in their stored top-to-bottom order.
- Clicking a layer row activates it.
- Provide inline rename with blank names rejected/reverted.
- Provide accessible Move Up and Move Down buttons, disabled at the respective boundaries.
- Provide an Add Layer action.
- Provide Delete for every layer except the final remaining layer.
- Deleting an empty layer happens immediately.
- Deleting a non-empty layer uses an inline confirm/cancel state; do not use a browser modal.
- Clearly identify the active layer using both visual and semantic state.
- Do not include visibility controls.

### View UI

- Provide a `flat`/`layers` view toggle.
- Show circular previous/next navigation and an explicit `Layer N of M` status in layers view.
- Keep the layer list and circular navigation synchronized through `activeLayerId`.
- Expose accessible names and current values for the toggle, status, and navigation controls.

### File UI

- Import CSV as a new layer.
- Export the active layer as CSV; other layers must first be activated.
- Import a current JSON document or legacy v2 state.
- Export the durable plate document as versioned JSON.
- JSON import requires inline confirmation before replacing current state.
- Display parse/validation errors inline without replacing current state.
- Native hidden file inputs and browser Blob downloads are acceptable.
- Provide sensible download names derived from the active layer for CSV and `plate-map.json` for JSON; sanitize unsafe filename characters.

## CSV Interchange

Version 2 supports a tidy row-based CSV format for importing a new layer and exporting one layer. The plate-shaped matrix format is not accepted by the new importer.

Example:

```csv
Well,Annotation,Annotation Key,Color,Concentration,Active
A1,Vehicle,vehicle,gray,0,true
A2,Drug A,drug-a,blue,5,true
A3,Drug A,drug-a,blue,5,true
```

### CSV schema and behavior

- Required columns: `Well`, `Annotation`.
- Optional reserved columns: `Annotation Key`, `Color`.
- All other columns are annotation metadata keys.
- `Well` uses the existing Excel-style coordinate parser and must be valid for the current plate size.
- `Annotation Key` groups multiple rows into one annotation but is not used as its internal ID. Every imported annotation receives a fresh UUID.
- When `Annotation Key` is absent, rows with the same annotation label, color, and non-empty metadata values are grouped into one annotation.
- Conflicting labels, colors, or metadata for the same explicit key are validation errors.
- Repeated identical well/key rows are deduplicated.
- Omitted colors cycle through `ANNOTATION_STYLES` in first-appearance order.
- Invalid explicit colors are validation errors.
- Empty metadata cells mean the metadata key is absent on that annotation.
- Infer unquoted or quoted `true`/`false` as booleans and numeric text as numbers; keep all other values as strings.
- Metadata remains flat and limited to `string | number | boolean | null`, matching `AnnotationMetadata`. CSV imports do not produce `null` values.
- CSV import always creates a new layer at index `0`, makes it active, and never appends to or replaces an existing layer.
- When imported through `PlateControls`, use the source file's base name as the initial layer name. Fall back to the next default `Layer N` when a filename is unavailable or blank.
- CSV export includes `Annotation Key` values sufficient to preserve annotation grouping on re-import. It may use the internal UUID as the exported key, even though re-import generates a fresh UUID.
- Export emits the union of metadata columns across annotations and leaves cells empty where an annotation lacks a key.

## Versioned JSON

JSON is the lossless, canonical interchange format.

### Durable document

```ts
interface PlateDocumentV1 {
  schemaVersion: 1;
  plateSize: PlateSize;
  excludedWells: number[];
  layers: PlateLayer[];
}
```

- Persist layer order, UUIDs, names, annotations, styles, class names, and flat primitive metadata exactly.
- Do not persist transient selection, active layer, active annotation, or view mode.
- JSON export serializes only this durable document.
- On current-document import, initialize `activeLayerId` to `layers[0].id`, clear selection and active annotation, and use `viewMode: "flat"`.

### Zod API

Add `zod` as a runtime dependency and publicly export:

- `plateDocumentSchema`
- `parsePlateDocument(input): PlateDocumentV1`
- `migrateLegacyPlateState(input, options?): PlateState`
- `parsePlateState(input, options?): PlateState`

`plateDocumentSchema` performs structural validation plus cross-field refinements for UUID uniqueness, non-empty layers, supported plate dimensions, valid well indices, and nonblank names. `parsePlateDocument` accepts only the current durable format and exposes Zod's structured validation errors.

`parsePlateState` is the convenience import entry point. It detects either a current `PlateDocumentV1` or the legacy flat v2 `PlateState`, then returns a ready-to-use v3 `PlateState`.

### Legacy v2 migration

- Validate the legacy shape before migrating it.
- Create one layer named `Layer 1` containing the legacy `wellAnnotations`.
- Generate a new UUID for the layer and fresh globally unique UUIDs for every migrated annotation rather than trusting legacy string IDs.
- Preserve `plateSize`, `excludedWells`, and valid global `selection`.
- Reset the active annotation.
- Make `Layer 1` active and set `viewMode: "flat"`.
- The legacy `activeWellAnnotation` does not need to be mapped.
- Invalid legacy wells or otherwise invalid legacy state returns a validation error rather than being repaired.

## Accessibility

- Preserve native buttons for selectable flat-view wells, row selectors, and column selectors.
- `PlateControls` layer activation must expose a single selected/current layer semantically.
- Reorder buttons require explicit layer-specific accessible names and correct disabled states.
- Inline rename and delete confirmation must be keyboard operable and restore focus sensibly on completion or cancellation.
- The view toggle exposes its current mode.
- The layers navigator announces the active layer name and its position, wraps in both directions, and supports buttons, horizontal scrolling, and left/right arrow keys.
- Layers layer planes are keyboard activatable even though their wells are not interactive.
- Layers transforms must not determine DOM reading order; reading order follows the top-to-bottom layer array.
- Color is never the only indicator of active state, selection, errors, or destructive confirmation.

## Performance and Responsive Behavior

- Supported plate sizes remain 24, 48, 96, 384, and 1,536 wells.
- The target worst case is eight layers at 1,536 wells in layers view.
- Avoid repeated per-well scans across every layer during render; pre-index annotations by layer and well with memoized derived data.
- Flat mode should render only one plate grid, regardless of layer count.
- Layers rendering may render all planes but should avoid mounting interactive selection machinery such as one `Selecto` instance per plane.
- Keep animation limited to transforms and opacity where possible.
- The layers container must reserve or calculate sufficient space for exploded offsets, avoid clipping the focused layer, and remain usable at narrow widths through scaling and/or contained overflow.

## Error Handling

- Reducer actions with unknown IDs, invalid target indices, blank names, duplicate UUIDs, or invalid state fail predictably and do not partially mutate state.
- CSV/JSON parse failures preserve the existing plate state and produce actionable inline errors in `PlateControls`.
- Import errors should identify the file type and, where possible, the CSV row/column or Zod issue path.
- Canceling a destructive confirmation has no state effect.

## Testing Requirements

### Reducer and schemas

- Default one-layer initialization and injected UUID generation.
- Layer add, activate, rename, reorder, and delete transitions.
- Final-layer deletion rejection and non-empty deletion confirmation at the UI boundary.
- Active-layer replacement after deletion.
- Stable global selection across layer switches and views.
- Active annotation reset on layer changes.
- Plate-size shrink pruning while retaining empty annotations.
- State/document validation, UUID uniqueness, well ranges, and blank names.
- Current JSON parse/export round trip.
- Legacy v2 migration, including selection preservation and ID regeneration.

### CSV

- Required/reserved header validation.
- Excel-style coordinates for every supported plate size.
- Explicit-key grouping, implicit grouping, conflict errors, and row deduplication.
- Metadata union, blank optional values, escaping, and primitive type inference.
- Color cycling and invalid-color errors.
- Import creates and activates a new top layer with a filename-derived name.
- Export/re-import preserves layer annotation content and grouping, excluding UUID identity.

### Rendering and controls

- Flat mode renders only active-layer annotations.
- One-to-four segment rendering and five-plus `+N` overflow behavior in light and dark themes.
- Layers view renders every layer plane, names it, omits coordinate headers, and disables well editing.
- Scrubber and plane activation synchronize active state.
- Layer controls have correct accessible names, current state, disabled boundaries, focus behavior, and inline confirmations.
- CSV/JSON file actions call the expected transitions and surface errors.
- Reduced-motion behavior is respected.

### Performance smoke test

- Render and change focus across eight 1,536-well layers without errors or pathological rerender loops. Record a reasonable local benchmark during implementation; do not encode a fragile wall-clock assertion in unit tests.

## Documentation and Demo

- Update the demo app to exercise the canonical `usePlateReducer` integration.
- Demonstrate layer creation, activation, inline rename, reordering, deletion, flat/layers switching, circular navigation, annotation overflow, CSV import/export, JSON round trip, and a surfaced import error.
- Update the README with the v3 grouped-prop example, public data model, ordering convention, file formats, CSS variables, and links to the demo.
- Document that v3 is intentionally breaking and that a runtime legacy migrator exists; a detailed migration guide is not required.

## Implementation Notes

- Extract a reusable read-only plate-plane renderer so flat and layers views share annotation/well visuals without duplicating selection behavior.
- Build memoized maps from `wellIndex` to a layer's ordered annotations. Flat mode needs only the active layer's map; layers view needs one map per layer.
- Keep `PlateControls` file handling thin by placing CSV and JSON parsing/serialization in exported pure utilities.
- Export pure utilities equivalent to `parseLayerCSV`, `layerToCSV`, `plateStateToDocument`, and `plateDocumentToJSON`. Parsing utilities accept the current plate size and ID factory where required; reducer actions commit their validated results atomically.
- Prefer reducer helpers that validate first and return a new state atomically.
- Zod schemas for generic TypeScript metadata should validate the supported runtime primitive record rather than attempting to preserve arbitrary compile-time-only generic types.
- Use data attributes and semantic class names internally for testing and CSS targeting, but treat the documented CSS variables—not internal class names—as the customization contract.

## Rollout and Success Criteria

The feature is ready to release when:

- The package builds and publishes as version 2.0.0.
- The public API has no remaining flat `wellAnnotations` state path or legacy long-form `Plate` props.
- A consumer can manage the complete layer lifecycle with `PlateControls` and `usePlateReducer`.
- Flat and layers views behave consistently across all supported plate sizes.
- Per-layer CSV and versioned JSON workflows pass round-trip tests.
- Legacy v2 state migrates through the exported parser/migrator.
- Accessibility, reducer, schema, rendering, and performance-target tests pass.
- README and demo describe the shipped API accurately.

## Open Questions

None. Product decisions needed for v1 are resolved in this specification.
