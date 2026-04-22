import Foundation
import Capacitor
import AuthenticationServices
import LocalAuthentication
import UIKit

/// Native Capacitor plugin for passkey authentication.
///
/// Uses ASAuthorizationController (iOS 16+) instead of WKWebView WebAuthn,
/// which bypasses the "Use this passkey" confirmation sheet and invokes
/// Face ID / Touch ID directly.
@objc(NativePasskeyPlugin)
public class NativePasskeyPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "NativePasskeyPlugin"
    public let jsName = "NativePasskey"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    // Retain handler until auth completes
    private var activeHandler: AnyObject?

    @objc func authenticate(_ call: CAPPluginCall) {
        // Biometric-only path: use LAContext directly, no passkey dialog.
        if call.getString("challenge") == nil {
            let reason = call.getString("reason") ?? "Unlock FRED"
            let context = LAContext()
            var error: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                call.reject(error?.localizedDescription ?? "Biometrics not available")
                return
            }
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authError in
                DispatchQueue.main.async {
                    if success {
                        call.resolve(["verified": true])
                    } else if let laError = authError as? LAError, laError.code == .userCancel {
                        call.reject("USER_CANCELLED")
                    } else {
                        call.reject(authError?.localizedDescription ?? "Biometric authentication failed")
                    }
                }
            }
            return
        }

        // Full FIDO2 passkey path.
        guard #available(iOS 16.0, *) else {
            call.reject("Passkey authentication requires iOS 16 or later")
            return
        }

        guard let challengeB64 = call.getString("challenge"),
              let rpId = call.getString("rpId") else {
            call.reject("Missing required parameters: challenge and rpId")
            return
        }

        guard let challengeData = Data(base64urlEncoded: challengeB64) else {
            call.reject("Invalid challenge encoding")
            return
        }

        let userVerification = call.getString("userVerification") ?? "preferred"
        let allowedCreds = call.getArray("allowedCredentials") as? [[String: Any]] ?? []

        let handler = NativePasskeyHandler()
        self.activeHandler = handler

        DispatchQueue.main.async {
            handler.performAuthentication(
                call: call,
                bridge: self.bridge,
                challenge: challengeData,
                rpId: rpId,
                userVerification: userVerification,
                allowedCredentials: allowedCreds,
                onComplete: { [weak self] in
                    self?.activeHandler = nil
                }
            )
        }
    }
}

@available(iOS 16.0, *)
class NativePasskeyHandler: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private var call: CAPPluginCall?
    private weak var bridge: CAPBridgeProtocol?
    private var controller: ASAuthorizationController?
    private var onComplete: (() -> Void)?

    func performAuthentication(
        call: CAPPluginCall,
        bridge: CAPBridgeProtocol?,
        challenge: Data,
        rpId: String,
        userVerification: String,
        allowedCredentials: [[String: Any]],
        onComplete: @escaping () -> Void
    ) {
        self.call = call
        self.bridge = bridge
        self.onComplete = onComplete

        let provider = ASAuthorizationPlatformPublicKeyCredentialProvider(relyingPartyIdentifier: rpId)
        let request = provider.createCredentialAssertionRequest(challenge: challenge)

        switch userVerification {
        case "required":    request.userVerificationPreference = .required
        case "discouraged": request.userVerificationPreference = .discouraged
        default:            request.userVerificationPreference = .preferred
        }

        if !allowedCredentials.isEmpty {
            let descriptors = allowedCredentials.compactMap { cred -> ASAuthorizationPlatformPublicKeyCredentialDescriptor? in
                guard let idB64 = cred["id"] as? String,
                      let idData = Data(base64urlEncoded: idB64) else { return nil }
                return ASAuthorizationPlatformPublicKeyCredentialDescriptor(credentialID: idData)
            }
            if !descriptors.isEmpty {
                request.allowedCredentials = descriptors
            }
        }

        let controller = ASAuthorizationController(authorizationRequests: [request])
        controller.delegate = self
        controller.presentationContextProvider = self
        self.controller = controller
        controller.performRequests()
    }

    // MARK: - ASAuthorizationControllerDelegate

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let call = call else { return }
        self.call = nil
        onComplete?()

        guard let credential = authorization.credential as? ASAuthorizationPlatformPublicKeyCredentialAssertion else {
            call.reject("Unexpected credential type")
            return
        }

        var responseDict: [String: Any] = [
            "clientDataJSON": credential.rawClientDataJSON.base64URLEncodedString(),
            "authenticatorData": credential.rawAuthenticatorData.base64URLEncodedString(),
            "signature": credential.signature.base64URLEncodedString()
        ]
        if let userID = credential.userID {
            responseDict["userHandle"] = userID.base64URLEncodedString()
        }

        call.resolve([
            "id": credential.credentialID.base64URLEncodedString(),
            "rawId": credential.credentialID.base64URLEncodedString(),
            "response": responseDict,
            "type": "public-key",
            "clientExtensionResults": [String: Any]()
        ])
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
        guard let call = call else { return }
        self.call = nil
        onComplete?()

        if let authError = error as? ASAuthorizationError, authError.code == .canceled {
            call.reject("USER_CANCELLED")
        } else {
            call.reject("Authentication failed: \(error.localizedDescription)")
        }
    }

    // MARK: - ASAuthorizationControllerPresentationContextProviding

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene,
           let window = scene.windows.first(where: { $0.isKeyWindow }) {
            return window
        }
        return UIWindow()
    }
}

// MARK: - Data base64url helpers

private extension Data {
    init?(base64urlEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        while base64.count % 4 != 0 { base64 += "=" }
        self.init(base64Encoded: base64)
    }

    func base64URLEncodedString() -> String {
        return base64EncodedString()
            .replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_")
            .replacingOccurrences(of: "=", with: "")
    }
}
