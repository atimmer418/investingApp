import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Tracks whether the app fully entered background (vs. briefly inactive for Face ID, calls, etc.)
    private var didEnterBackground = false
    private let loadingOverlayTag = 9001

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Force light background on the native window so it shows through
        // keyboard rounded corners even when the device is in dark mode.
        window?.backgroundColor = UIColor(red: 248/255, green: 250/255, blue: 252/255, alpha: 1)
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Show the loading overlay synchronously here — iOS takes its background snapshot
        // between applicationWillResignActive and applicationDidEnterBackground, so this
        // guarantees the snapshot captures the loading screen instead of app content.
        showLoadingOverlay()
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        didEnterBackground = true
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Nothing needed — overlay removal is handled in applicationDidBecomeActive.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        if didEnterBackground {
            // Safety fallback only — JS calls LoadingOverlayPlugin.hide() deterministically
            // once the correct content is ready. This 3s timer only fires if JS fails to signal.
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
                self?.removeLoadingOverlay()
            }
        } else {
            // Briefly inactive only (Face ID prompt, incoming call, Control Center, etc.):
            // remove immediately so the overlay never visibly blocks the UI.
            removeLoadingOverlay()
        }
        didEnterBackground = false
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    // MARK: - Loading overlay

    private func showLoadingOverlay() {
        guard let window = window, window.viewWithTag(loadingOverlayTag) == nil else { return }

        let overlay = UIView(frame: window.bounds)
        overlay.backgroundColor = .white
        overlay.tag = loadingOverlayTag

        let label = UILabel()
        label.text = "this will be the loading screen"
        label.font = UIFont.systemFont(ofSize: 16, weight: .regular)
        // #6b7280
        label.textColor = UIColor(red: 107/255, green: 114/255, blue: 128/255, alpha: 1)
        label.translatesAutoresizingMaskIntoConstraints = false

        overlay.addSubview(label)
        NSLayoutConstraint.activate([
            label.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            label.centerYAnchor.constraint(equalTo: overlay.centerYAnchor)
        ])

        window.addSubview(overlay)
        window.bringSubviewToFront(overlay)
    }

    func removeLoadingOverlay() {
        window?.viewWithTag(loadingOverlayTag)?.removeFromSuperview()
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
