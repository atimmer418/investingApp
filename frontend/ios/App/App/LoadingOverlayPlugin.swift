import Foundation
import Capacitor
import UIKit

@objc(LoadingOverlayPlugin)
public class LoadingOverlayPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "LoadingOverlayPlugin"
    public let jsName = "LoadingOverlay"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise)
    ]

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            if let appDelegate = UIApplication.shared.delegate as? AppDelegate {
                appDelegate.removeLoadingOverlay()
            }
            if let mvc = self?.bridge?.viewController as? MainViewController {
                mvc.removeBridgeLoadingOverlay()
            }
        }
        call.resolve()
    }
}
