---
name: Dead code cleanup after template rewrites
description: Builder tends to leave TS properties/listeners orphaned when HTML template is fully rewritten — check for dead references
type: feedback
---

When the builder rewrites an HTML template completely (e.g., get-started redesign), TS properties and event listeners that were only consumed by the old template may be left behind as dead code.

**Why:** The builder focuses on writing the new template and removing unused imports but can miss class-level properties and lifecycle logic that referenced the old DOM structure.

**How to apply:** After any full template rewrite, grep the TS file for properties declared but never referenced in the new HTML. Pay special attention to event listeners in `ngAfterViewInit` / `ngOnInit` that set properties only used in old template bindings.
