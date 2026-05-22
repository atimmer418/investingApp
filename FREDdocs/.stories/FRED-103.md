# FRED-103 — iOS Xcode plugin build target and EXPO investigation

## Before
```
## FRED-103 — iOS Xcode plugin build target and EXPO investigation
After syncing capacitor copy ios, you'll need to ensure the new KeychainSyncPlugin.swift is included in the Xcode project's build target. Capacitor custom plugins placed in App/App/ are typically picked up automatically, but double-check in Xcode that the file appears under the App target's "Compile Sources" build phase. look into EXPO for deploying to app store?
```

## Summary
Two sub-tasks: (1) Verify `KeychainSyncPlugin.swift` is in Xcode's Compile Sources — **already confirmed** from `project.pbxproj` (entry `KeychainSyncPlugin.swift in Sources`). No action needed. (2) Investigate Expo as an alternative to Capacitor for App Store deployment — this is a strategic research and founder decision.

## Files
No code changes needed for sub-task 1 (already done). Sub-task 2 (Expo) is research-only.

## Doc References
- Xcode project: `frontend/ios/App/App.xcodeproj/project.pbxproj`

## Acceptance Criteria
1. ✅ ALREADY DONE — `KeychainSyncPlugin.swift` is confirmed in the Compile Sources build phase. No Xcode changes needed.
2. [Founder research] Evaluate Expo EAS Build vs current Capacitor + Xcode workflow for App Store deployment. Decision factors: CI/CD simplicity, OTA updates, plugin compatibility (passkeys / WebAuthn, Capacitor Keychain plugin), cost. Document decision or just choose and proceed.

## Edge Cases / Open Questions
- Expo requires Expo SDK — FRED uses Ionic + Capacitor. Migration would be significant and potentially incompatible with existing Capacitor plugins (custom `KeychainSyncPlugin`, Yubico passkey bridge). Unless Expo offers a strong advantage, recommendation is to stay on Capacitor and use Xcode + App Store Connect directly.
- The Xcode build target question is resolved — no code changes needed.

## Time Estimate
`<1hr` (research only; code work is zero)

## Label
`[founder]`
