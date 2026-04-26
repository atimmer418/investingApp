import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Tracks whether the app fully entered background (vs. briefly inactive for Face ID, calls, etc.)
    private var didEnterBackground = false
    // True until the first time the app becomes active — used to distinguish cold start.
    private var isColdStart = true
    private var loadingOverlayWindow: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Force light background on the native window so it shows through
        // keyboard rounded corners even when the device is in dark mode.
        window?.backgroundColor = .white
        // Cover the WebView during cold start so there's no white flash between
        // the system launch screen and the HTML cover div becoming visible.
        showLoadingOverlay()
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
        if isColdStart {
            // Cold start: overlay was shown during launch; JS calls LoadingOverlay.hide()
            // when the app is ready. 3s fallback in case JS never signals.
            isColdStart = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
                self?.removeLoadingOverlay()
            }
        } else if didEnterBackground {
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
        guard loadingOverlayWindow == nil else { return }

        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)

        let win: UIWindow
        if let scene = UIApplication.shared.connectedScenes.first(where: { $0 is UIWindowScene }) as? UIWindowScene {
            win = UIWindow(windowScene: scene)
        } else {
            win = UIWindow(frame: UIScreen.main.bounds)
        }
        win.windowLevel = .alert + 1
        win.backgroundColor = .white

        let vc = UIViewController()
        vc.view.backgroundColor = .white

        let imageView = UIImageView(image: UIImage(named: "FREDLogo"))
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        vc.view.addSubview(imageView)

        NSLayoutConstraint.activate([
            imageView.centerXAnchor.constraint(equalTo: vc.view.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: vc.view.centerYAnchor),
            imageView.widthAnchor.constraint(equalToConstant: 200),
            imageView.heightAnchor.constraint(equalToConstant: 200)
        ])

        win.rootViewController = vc
        win.isHidden = false

        loadingOverlayWindow = win
    }

    func removeLoadingOverlay() {
        loadingOverlayWindow?.isHidden = true
        loadingOverlayWindow?.rootViewController = nil
        loadingOverlayWindow = nil
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
