# AnQst DSL Structure and Validity

## 1. Purpose

This document defines the generator-facing validity contract for AnQst-Spec files.
It resolves current ambiguities in canonical and example sources so a Node.js/TypeScript generator can parse and validate inputs deterministically.

Normative keywords: **MUST**, **MUST NOT**, **SHOULD**, **MAY**.

## 2. Input Document Shape

An AnQst-Spec file:

- MUST be a `.d.ts` file.
- MUST contain exactly one top-level widget namespace declaration.
- MAY contain zero or more service interfaces inside that namespace.
- MAY contain namespace-local type declarations (`interface`, `type`) that are independent of services.
- MAY import external types used in method arguments or generic payloads.
- MUST NOT contain executable runtime code.

### 2.1 Top-level namespace rule

- The widget namespace MUST be declared as `declare namespace WidgetName { ... }`.
- The namespace identifier (`WidgetName`) is the canonical widget name used in generated artifacts.
- `export namespace` at top level is INVALID for widget specs.

Decision rationale: examples use `declare namespace`; this also aligns with "spec as declaration only".

### 2.2 Canonical directive spelling

- The canonical directive namespace is `AnQst.Type.*` (singular).
- Any `AnQst.Types.*` usage in docs/examples is treated as a typo and MUST be normalized to `AnQst.Type.*`.

## 3. Allowed Members and Signatures

Inside the widget namespace, each service MUST be declared as:

- `interface ServiceName extends AnQst.Service { ... }`
  or
- `interface ServiceName extends AnQst.AngularHTTPBaseServerClass { ... }`

Service members MUST be one of:

1. Method returning `AnQst.Call<T>`
2. Method returning `AnQst.Slot<T>`
3. Method returning `AnQst.Emitter`
4. Property typed `AnQst.Output<T>`
5. Property typed `AnQst.Input<T>`

No other service member types are valid.

`AnQst.AngularHTTPBaseServerClass` is a capability marker for generation/runtime mode and does not change member syntax requirements.

### 3.1 Method and property form

- `Call`, `Slot`, `Emitter` MUST be methods.
- `Output`, `Input` MUST be properties.
- Optional members (`?`) are INVALID.
- Overloads are INVALID.
- Duplicate method declarations with identical parameter lists are INVALID.
- Repeated method names used only to show alternative mappings are allowed in prose snippets, but MUST NOT appear in normative DSL input.
- Rest parameters are INVALID.

## 3.2 Namespace-local type declarations

Inside the widget namespace, the following are VALID:

- `interface Name { ... }`
- `type Name = ...`

These declarations:

- MUST participate in generation even when no service interfaces exist.
- MAY reference imported types.
- MAY reference type aliases and interfaces declared earlier in the file.
- MUST be included in output if they are namespace-declared, or transitively reachable from such declarations.

File-scope (outside namespace) declarations are allowed as helper types for authoring, but they are not widget-surface declarations by themselves. They become generation-relevant only when referenced from namespace declarations.

## 3.3 Generation roots and reachability

- Namespace-local declarations (`declare namespace WidgetName { ... }`) are always generation roots.
- Service signatures and service property payload types are generation roots.
- Externally declared/imported types become generation roots only when transitively reachable from a root.
- A spec with zero services is VALID and MUST still generate namespace-rooted types.

## 4. Payload Type Rules

## 4.1 Generic payload type `T`

For `Call<T>`, `Slot<T>`, `Output<T>`, `Input<T>`:

- `T` MUST be serializable by the AnQst bridge contract.
- Primitives (`string`, `number`, `boolean`) are VALID.
- Structured object types are VALID.
- Arrays are VALID if element type is valid.
- `void` is VALID only for `Slot<void>`.

### 4.2 Promise prohibition inside generic payloads

- `Call<Promise<X>>` is INVALID.
- Nested Promise payloads in any generic position are INVALID.

Reason: asynchronous request/reply behavior is carried by the interaction kind itself (`Call`), not by wrapping payload type in `Promise`.

### 4.3 Unsupported/invalid payload shapes

The following are INVALID until explicitly specified in future revisions:

- Function-valued fields.
- `symbol`, `unknown`, `never`, `any`.
- Cyclic object graphs.

Union types are valid and MUST be preserved in generated TypeScript declarations.
For C++ generation, unions MUST either:

- map through a deterministic generator strategy (for example tagged variant), or
- fail generation with an actionable unsupported-union diagnostic.

Intersection support is deferred unless fully closed over valid serializable object forms.

### 4.4 `AnQst.Type.*` advisory mapping directives

- `AnQst.Type.*` tokens are DSL mapping directives and are valid in type positions in the DSL input.
- Valid usage positions:
  - method parameter type,
  - method return payload position (`Call<T>`, `Slot<T>`),
  - `Input<T>`/`Output<T>` payload position,
  - namespace-local type alias targets and nested object fields.
- `T[]` and `Array<T>` are equivalent for generator semantics.
- `AnQst.Type.X[]` and `Array<AnQst.Type.X>` are equivalent and apply the directive to element mapping.

Advisory behavior:

- `AnQst.Type.*` is advisory, not mandatory.
- Generator SHOULD attempt to honor advisory mapping, but MAY choose inferred/default mapping if required by implementation constraints.
- If advisory mapping is not honored, generator MUST emit a deterministic advisory-mismatch diagnostic.

## 5. Import and Type Resolution

- Imported types MUST resolve using normal TypeScript module resolution from the spec file location.
- All referenced types MUST be fully resolvable at generation time.
- Missing imports or unresolved symbols MUST fail generation with a diagnostic.
- Imported types are treated as declaration contracts only; runtime JS import behavior is out of scope.

## 6. Ambiguity Matrix and Decisions

| Topic | Observed ambiguity | Decision (normative) |
|---|---|---|
| Top-level namespace | `declare` vs `export` in historical docs | MUST use `declare namespace` in widget spec files |
| `Call<T extends {}>` vs primitive usage | Canonical helper constraint conflicts with `Call<boolean>` example | Primitives are valid payloads; generator treats helper constraint as non-normative |
| `Input` direction wording | Header says Widget->Parent, flow text looked Parent->Widget | Direction is Widget->Parent for state publication |
| `Emitter` typing | No generic payload type on helper type | Method parameter list defines emitted payload shape |
| Slot queue behavior | "queues until handler is set" underspecified | FIFO queue, bounded policy defined in interaction spec |
| Error behavior | Not specified for missing handlers/exceptions | Deterministic error semantics defined in interaction spec |
| Type-only namespace specs | Unclear whether generation requires `AnQst.Service` | Type declarations inside widget namespace are generation targets even with zero services |
| `AnQst.Type` spelling | `Type` vs `Types` in canonical docs | `AnQst.Type.*` is canonical; `AnQst.Types.*` is a typo |
| Mapping precedence | Unclear whether directives are hard overrides | `AnQst.Type.*` is advisory; generator may fall back and must diagnose |
| Duplicate signatures | Alternative examples could be read as overloads | Duplicate identical signatures are invalid in normative DSL input |

## 7. Valid Examples

```ts
declare namespace UserManagement {
  interface UserService extends AnQst.Service {
    getUserById(userId: string): AnQst.Call<User>;
    userNameAvailable(userId: string): AnQst.Call<boolean>;
    editUser(user: User): AnQst.Slot<boolean>;
    badWord(word: string): AnQst.Emitter;
    activeUsers: AnQst.Output<number>;
    currentUsername: AnQst.Input<string>;
  }
}
```

## 8. Invalid Examples

```ts
export namespace BadWidget {
  interface S extends AnQst.Service {
    foo?(): AnQst.Call<number>;                    // invalid optional member
    bar(value: string): AnQst.Call<Promise<boolean>>; // invalid Promise payload
    baz: AnQst.Call<number>;                       // invalid method/property form
    qux(...args: string[]): AnQst.Emitter;         // invalid rest parameter
  }
}
```

## 9. Type-only Valid Example (No Services)

```ts
import { User } from './types/exchange';
import * as D from './othermodule';

interface helper {
  one: number;
}

declare namespace Example {
  interface Test extends helper {}
  type UserType = User;
  type SomeType = D.SomeType;
  type MyType = 'this' | 'that';
  interface SomeInterface {
    num: 1 | 2;
    tt: User;
    t: UserType;
    mt: MyType[];
  }
}
```

Expected validity result: VALID.

