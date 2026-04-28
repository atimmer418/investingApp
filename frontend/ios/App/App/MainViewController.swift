import Foundation
import Capacitor
import UIKit

class MainViewController: CAPBridgeViewController {

    // Paints synchronously in viewDidLoad to fill the gap between iOS LaunchScreen
    // disappearing and Capacitor's SplashScreen plugin (which dispatches async) painting.
    private var bridgeLoadingOverlay: UIView?

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativePasskeyPlugin())
        bridge?.registerPluginInstance(KeychainSyncPlugin())
        bridge?.registerPluginInstance(LoadingOverlayPlugin())
        bridge?.webView?.isOpaque = false
        bridge?.webView?.backgroundColor = .white
        bridge?.webView?.scrollView.backgroundColor = .white
    }

    override func viewDidLoad() {
        super.viewDidLoad()

        // Backup: ensures the bridge VC view paints white even before subviews lay out.
        view.backgroundColor = .white

        // Frame-based (not constraint-based) so it has correct geometry on first paint
        // without waiting for a layout pass.
        let screen = UIScreen.main.bounds
        let overlay = UIView(frame: screen)
        overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        overlay.backgroundColor = .white
        overlay.isUserInteractionEnabled = false

        let imgSize: CGFloat = 200
        let imageView = UIImageView(image: UIImage(named: "FREDLogo"))
        imageView.contentMode = .scaleAspectFit
        imageView.frame = CGRect(
            x: (screen.width - imgSize) / 2,
            y: (screen.height - imgSize) / 2,
            width: imgSize,
            height: imgSize
        )
        imageView.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin, .flexibleTopMargin, .flexibleBottomMargin]
        overlay.addSubview(imageView)

        view.addSubview(overlay)
        bridgeLoadingOverlay = overlay
    }

    func removeBridgeLoadingOverlay() {
        bridgeLoadingOverlay?.removeFromSuperview()
        bridgeLoadingOverlay = nil
    }
}
