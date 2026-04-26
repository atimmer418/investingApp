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

        let overlay = UIView()
        overlay.backgroundColor = .white
        overlay.translatesAutoresizingMaskIntoConstraints = false
        overlay.isUserInteractionEnabled = false

        let imageView = UIImageView(image: UIImage(named: "FREDLogo"))
        imageView.contentMode = .scaleAspectFit
        imageView.translatesAutoresizingMaskIntoConstraints = false
        overlay.addSubview(imageView)

        view.addSubview(overlay)

        NSLayoutConstraint.activate([
            overlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            overlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            overlay.topAnchor.constraint(equalTo: view.topAnchor),
            overlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            imageView.centerXAnchor.constraint(equalTo: overlay.centerXAnchor),
            imageView.centerYAnchor.constraint(equalTo: overlay.centerYAnchor),
            imageView.widthAnchor.constraint(equalToConstant: 200),
            imageView.heightAnchor.constraint(equalToConstant: 200)
        ])

        bridgeLoadingOverlay = overlay
    }

    func removeBridgeLoadingOverlay() {
        bridgeLoadingOverlay?.removeFromSuperview()
        bridgeLoadingOverlay = nil
    }
}
