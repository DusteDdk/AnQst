# Codec Architecture Deletion Report

This report records the superseded assumptions and runtime patterns that were removed as part of the codec architecture overhaul.

## Removed Architectural Assumptions

- Finite-domain values no longer collapse into generic `string`, `boolean`, or `number` leaves before planning.
- Generated public C++ types no longer widen finite-domain aliases to `QString`, `bool`, or `double` by default.
- Non-boundary nested anonymous C++ types no longer derive names from boundary-site traversal paths when a canonical declaration identity exists.
- Strongly typed boundary decoding no longer relies on a pre-scan/count pass to discover grouped string, binary, or dynamic region sizes.
- Emitted TS/C++ boundary codecs no longer use a fixed `bytes/strings/binaries/dynamics` grouping recipe as the runtime codec shape.
- Drag/drop helpers no longer normalize every payload through a generic JSON array of wire items.

## Removed Runtime Patterns

- `stringCount`, `binaryCount`, `dynamicCount`, and `countOffset` pre-scan bookkeeping in emitted boundary decoders.
- Generated helper flows that grouped all strings, binaries, and dynamics into separate runtime arrays regardless of the chosen plan.
- Conservative `using <Alias> = QString; // union mapped conservatively` emission for finite-domain aliases.
- Generated C++ references to site-path synthetic names such as `CdEntryService_validateDraft_draft_createdBy_meta` where the canonical declaration identity is `User_meta`.
- Drag/drop JSON helper code that serialized `anqstNormalizeWireItems(encode...)` and required `document.isArray()` on decode.

## Retained Generic Infrastructure

The following remain intentionally generic because they are host-bridge infrastructure rather than boundary codec logic:

- `QVariant` / `QVariantList` bridge surfaces
- QWebChannel dispatch plumbing
- host bridge facade registration and routing
- generated drag/drop MIME dispatch at the host boundary

The architectural change was specifically to remove generic codec behavior, not generic hosting.
