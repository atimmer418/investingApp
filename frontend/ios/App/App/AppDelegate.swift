import UIKit
import Capacitor
import Lottie

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    // Tracks whether the app fully entered background (vs. briefly inactive for Face ID, calls, etc.)
    private var didEnterBackground = false
    // True until the first time the app becomes active — used to distinguish cold start.
    private var isColdStart = true
    private let loadingOverlayTag = 9001
    // Single LottieAnimationView reused across show/hide cycles. Instantiating per-show
    // caused white snapshots on first background — the new view's CALayer had no
    // contents before iOS captured the App Switcher snapshot. Reusing keeps the layer
    // warm with the last-rendered frame.
    private lazy var sharedLottieView: LottieAnimationView = {
        let v = LottieAnimationView(name: "coin-drop")
        v.contentMode = .scaleAspectFill
        v.loopMode = .loop
        v.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        v.play()
        return v
    }()

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
            // when the app is ready. 10s fallback to handle slow server loads.
            isColdStart = false
            DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) { [weak self] in
                self?.removeLoadingOverlay()
            }
        } else if didEnterBackground {
            // Safety fallback only — JS calls LoadingOverlayPlugin.hide() deterministically
            // once the correct content is ready. 10s fallback for slow loads.
            DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) { [weak self] in
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

        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)

        let overlay = UIView(frame: window.bounds)
        overlay.tag = loadingOverlayTag
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.backgroundColor = .white
        overlay.isUserInteractionEnabled = false

        // Reuse the shared LottieAnimationView so its CALayer stays warm across resigns.
        let anim = sharedLottieView
        anim.removeFromSuperview()
        anim.frame = window.bounds
        if !anim.isAnimationPlaying { anim.play() }
        overlay.addSubview(anim)

        window.addSubview(overlay)
        window.bringSubviewToFront(overlay)

        // Commit pending CA transactions before the runloop yields to iOS for snapshotting.
        overlay.layoutIfNeeded()
        CATransaction.flush()
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
