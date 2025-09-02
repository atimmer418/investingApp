export interface SelectedPaycheck {
    accountId: string;
    name: string;
    withdrawalPercentage: number; // Store as 0.0 to 1.0 (e.g., 0.1 for 10%)
    
    // Manual configuration fields for webhook matching
    employerName?: string; // Company/employer name for transaction matching
    expectedAmount?: number; // Approximate expected amount for matching
    frequency?: string; // Pay frequency for pattern matching
}