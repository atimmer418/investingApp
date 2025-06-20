export interface SelectedPaycheck {
    accountId: string;
    name: string;
    withdrawalPercentage: number; // Store as 0.0 to 1.0 (e.g., 0.1 for 10%)
}