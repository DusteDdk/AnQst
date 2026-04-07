## Prime Directives

### 1) Keep it simple

- Prioritize simplicity over resilience and strict timing behavior.
- There is not, and will never be any versioning of the wire-format, it is always latest code, there will never be backwards compatibility or multiple active versions.
- Do not add HA/failover/recovery complexity unless where explicitly requested, always confirm with the supervisor.
- Do not add methods/types/messages/features/code that is not required by the current task.
- **NEVER** add anything:
  - "For the sake of symmetry"
  - "Because it may be useful in the future"
  - "As a fallback"
  - "Because it is best practice"
- **ONLY** add with explicit approval from the supervisor:
  - Abstractions
  - Helper methods
  - Superclasses
  - Error handling except that which is explicitly specified.
  - Return types, fields, methods, messages, which are not immediately used by the system or strictly required by the internal feature implementation.
- **NEVER**:
  - Mix system domains, data, methods, types or interfaces: The transport layer must stay completely opaque to the user-facing code.
