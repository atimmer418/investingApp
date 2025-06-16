export interface RegistrationFinishRequest {
    email: string;
    // This will be the JSON result from navigator.credentials.create()
    credential: any;
    temporaryUserId: string | null;
}