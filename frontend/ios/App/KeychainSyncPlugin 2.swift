import Foundation
import Capacitor
import Security

/**
 * Native Capacitor plugin for iCloud Keychain synchronization.
 *
 * Stores a small token (e.g. user email) in the iOS Keychain with
 * `kSecAttrSynchronizable = true`, which causes iCloud to sync it
 * across all devices signed into the same Apple ID.
 *
 * This lets the app recognize a returning user on a brand-new device
 * (after iCloud restore / sign-in) and auto-trigger passkey re-auth.
 */
@objc(KeychainSyncPlugin)
public class KeychainSyncPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "KeychainSyncPlugin"
    public let jsName = "KeychainSync"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
    ]

    private let serviceName = "com.fredvested.app"

    // MARK: - Plugin Methods

    /// Store a key-value pair in the iCloud-synced Keychain.
    @objc func set(_ call: CAPPluginCall) {
        guard let key = call.getString("key"),
              let value = call.getString("value") else {
            call.reject("Missing required parameters: key and value")
            return
        }

        let result = keychainSet(key: key, value: value)
        if result {
            call.resolve(["success": true])
        } else {
            call.reject("Failed to store value in Keychain")
        }
    }

    /// Retrieve a value from the iCloud-synced Keychain.
    @objc func get(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing required parameter: key")
            return
        }

        if let value = keychainGet(key: key) {
            call.resolve(["value": value])
        } else {
            // Not found is not an error — just return null
            call.resolve(["value": NSNull()])
        }
    }

    /// Remove a key from the iCloud-synced Keychain.
    @objc func remove(_ call: CAPPluginCall) {
        guard let key = call.getString("key") else {
            call.reject("Missing required parameter: key")
            return
        }

        let result = keychainDelete(key: key)
        call.resolve(["success": result])
    }

    // MARK: - Keychain Helpers

    private func keychainSet(key: String, value: String) -> Bool {
        guard let data = value.data(using: .utf8) else { return false }

        // Delete any existing item first (update = delete + add)
        keychainDelete(key: key)

        let query: [String: Any] = [
            kSecClass as String:              kSecClassGenericPassword,
            kSecAttrService as String:        serviceName,
            kSecAttrAccount as String:        key,
            kSecValueData as String:          data,
            kSecAttrAccessible as String:     kSecAttrAccessibleAfterFirstUnlock,
            kSecAttrSynchronizable as String: true   // <-- iCloud Keychain sync
        ]

        let status = SecItemAdd(query as CFDictionary, nil)
        return status == errSecSuccess
    }

    private func keychainGet(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String:              kSecClassGenericPassword,
            kSecAttrService as String:        serviceName,
            kSecAttrAccount as String:        key,
            kSecAttrSynchronizable as String: true,
            kSecReturnData as String:         true,
            kSecMatchLimit as String:         kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    @discardableResult
    private func keychainDelete(key: String) -> Bool {
        let query: [String: Any] = [
            kSecClass as String:              kSecClassGenericPassword,
            kSecAttrService as String:        serviceName,
            kSecAttrAccount as String:        key,
            kSecAttrSynchronizable as String: true
        ]

        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
}
