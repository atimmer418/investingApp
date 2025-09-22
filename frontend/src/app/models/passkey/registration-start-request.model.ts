export interface RegistrationStartRequest {
    email: string;
    planId: string;
    timeToFI: string;
    targetPortfolio: number;
    retirementIncome: number;
    monthlyInvestment: number;
}