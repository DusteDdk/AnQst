# AnQst Project Directory

This directory is owned by the AnQst CLI for this project.

## Files

- `UserManagement.AnQst.d.ts`: AnQst widget spec source.
- `UserManagement.settings.json`: project-local AnQst configuration used by `anqst build`.
- `generated/`: deterministic build output roots managed by `anqst build`.

## Regeneration

- `npx anqst build` refreshes generated outputs under `generated/`.
- Build hooks in package.json (`postinstall`, `prebuild`, `prestart`) call `npx anqst build`.

Do not hand-edit generated files under `generated/`; they are overwritten by design.
