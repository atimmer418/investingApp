// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false, // It's a test build, not a full production build
  backendApiUrl: 'https://796b-2600-4040-2a92-8800-a865-27f2-f55c-bf44.ngrok-free.app/api',
  rpId: '37de-2600-4040-2a92-8800-a865-27f2-f55c-bf44.ngrok-free.app', // Your test frontend/app origin hostname
  persona: {
    templateId: 'PERSONA_TEMPLATE_ID', // Replace with actual Persona template ID from dashboard
    environmentId: 'sandbox', // Use 'production' for production environment
    version: 'v4.11.0'
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
