#import <Foundation/Foundation.h>
#import <Capacitor/Capacitor.h>

CAP_PLUGIN(NativePasskeyPlugin, "NativePasskey",
    CAP_PLUGIN_METHOD(authenticate, CAPPluginReturnPromise);
)
