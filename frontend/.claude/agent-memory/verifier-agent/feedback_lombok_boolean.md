---
name: Lombok Boolean Jackson Mismatch
description: Primitive boolean fields named isXxx in Lombok @Data DTOs cause Jackson deserialization mismatches — setter becomes setXxx, JSON key expected is xxx not isXxx
type: feedback
---

When a Lombok `@Data` DTO has `private boolean isControlPerson`, Lombok generates:
- Getter: `isControlPerson()`
- Setter: `setControlPerson(boolean)` (strips the `is` prefix)

Jackson deserializes using the setter name, so it expects JSON key `controlPerson`, but the frontend sends `isControlPerson`.

**Why:** This silently drops boolean values on deserialization. They default to `false` which masks the bug in most cases, but user disclosures answered "Yes" would be lost.

**How to apply:** When reviewing DTOs with boolean fields that start with `is`, flag immediately. Fix options: (a) rename field to drop `is` prefix (`private boolean controlPerson`), or (b) add `@JsonProperty("isControlPerson")` annotation.
