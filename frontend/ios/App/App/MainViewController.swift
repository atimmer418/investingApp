import Foundation
import Capacitor

class MainViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(NativePasskeyPlugin())
        bridge?.registerPluginInstance(KeychainSyncPlugin())
        bridge?.registerPluginInstance(LoadingOverlayPlugin())
    }
}
