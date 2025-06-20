export interface PaycheckSource {
    accountId: string;
    name: string;
    lastAmount: number; // Plaid might send as number, backend DTO uses BigDecimal
    lastDate: string;   // ISO Date string
    frequency: string;
}