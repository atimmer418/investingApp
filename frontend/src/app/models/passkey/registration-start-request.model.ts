export interface RegistrationStartRequest {
    email: string;
    temporaryUserId: string; // From the Plaid flow
}