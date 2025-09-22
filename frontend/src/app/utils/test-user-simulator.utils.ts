import { JwtTokenUtils } from './jwt-token.utils';

/**
 * Test utility for simulating different user authentication and progress states
 * Use this for development and testing different user scenarios
 */
export class TestUserSimulator {

  /**
   * Generate a mock JWT token with specified expiration
   */
  private static generateMockJWT(email: string, userId: number, expirationMinutes: number = 60): string {
    // Create a mock JWT structure (header.payload.signature)
    // Note: This is for testing only - real JWTs come from the backend
    
    const header = {
      "alg": "HS256",
      "typ": "JWT"
    };
    
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      "sub": email,
      "iat": now,
      "exp": now + (expirationMinutes * 60), // Add expiration time
      "userId": userId
    };
    
    // Base64 encode (this is just for testing, not cryptographically secure)
    const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '');
    const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '');
    const mockSignature = 'mock_signature_for_testing';
    
    return `${encodedHeader}.${encodedPayload}.${mockSignature}`;
  }

  /**
   * Simulate a logged-in user with specific progress state
   */
  static simulateLoggedInUser(scenario: {
    email: string;
    userId: number;
    progress: {
      getStartedCompleted?: boolean;
      initialSurveyCompleted?: boolean;
      linkplaidCompleted?: boolean;
      investmentSurveyCompleted?: boolean;
      choseToPickStocks?: boolean;
      stockSelectionCompleted?: boolean;
      investmentConfirmationCompleted?: boolean;
    };
    tokenExpirationMinutes?: number;
  }): void {
    
    console.log('🧪 [TestUserSimulator] Setting up test user scenario...');
    
    // Clear any existing session
    JwtTokenUtils.clearJwtData();
    localStorage.clear();
    
    // Generate and store mock JWT
    const mockToken = this.generateMockJWT(
      scenario.email, 
      scenario.userId, 
      scenario.tokenExpirationMinutes || 60
    );
    
    JwtTokenUtils.storeJwtToken(mockToken, scenario.userId, scenario.email);
    
    // Set progress flags in localStorage (for now, until we implement server-side progress)
    const defaultProgress = {
      getStartedCompleted: false,
      initialSurveyCompleted: false,
      linkplaidCompleted: false,
      investmentSurveyCompleted: false,
      choseToPickStocks: false,
      stockSelectionCompleted: false,
      investmentConfirmationCompleted: false,
      ...scenario.progress
    };
    
    Object.entries(defaultProgress).forEach(([key, value]) => {
      localStorage.setItem(key, value.toString());
    });
    
    console.log('✅ [TestUserSimulator] Test user setup complete:', {
      email: scenario.email,
      userId: scenario.userId,
      progress: defaultProgress,
      tokenExpires: JwtTokenUtils.getMinutesUntilExpiration() + ' minutes'
    });
  }

  /**
   * Pre-configured test scenarios
   */
  static scenarios = {
    
    // User just completed get-started, needs to do initial survey
    freshUser: () => this.simulateLoggedInUser({
      email: 'fresh.user@test.com',
      userId: 1,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: false
      }
    }),

    // User completed survey, needs to link bank
    surveyCompleted: () => this.simulateLoggedInUser({
      email: 'survey.done@test.com',
      userId: 2,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: false
      }
    }),

    // User linked bank, needs to do investment survey
    bankLinked: () => this.simulateLoggedInUser({
      email: 'bank.linked@test.com',
      userId: 3,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true,
        investmentSurveyCompleted: false
      }
    }),

    // User at investment survey step (your current focus)
    atInvestmentSurvey: () => this.simulateLoggedInUser({
      email: 'at.investment@test.com',
      userId: 4,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true,
        investmentSurveyCompleted: false
      }
    }),

    // User chose to pick stocks manually
    needsStockSelection: () => this.simulateLoggedInUser({
      email: 'stock.picker@test.com',
      userId: 5,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true,
        investmentSurveyCompleted: true,
        choseToPickStocks: true,
        stockSelectionCompleted: false
      }
    }),

    // User chose guided investing, needs confirmation
    needsConfirmation: () => this.simulateLoggedInUser({
      email: 'needs.confirm@test.com',
      userId: 6,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true,
        investmentSurveyCompleted: true,
        choseToPickStocks: false,
        stockSelectionCompleted: true,
        investmentConfirmationCompleted: false
      }
    }),

    // Fully completed user (should go to main app)
    completedUser: () => this.simulateLoggedInUser({
      email: 'all.done@test.com',
      userId: 7,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true,
        investmentSurveyCompleted: true,
        choseToPickStocks: false,
        stockSelectionCompleted: true,
        investmentConfirmationCompleted: true
      }
    }),

    // User with expiring session (2 minutes left)
    expiringSoon: () => this.simulateLoggedInUser({
      email: 'expiring@test.com',
      userId: 8,
      progress: {
        getStartedCompleted: true,
        initialSurveyCompleted: true,
        linkplaidCompleted: true
      },
      tokenExpirationMinutes: 2
    }),

    // Completely fresh start (no authentication)
    freshStart: () => {
      console.log('🧪 [TestUserSimulator] Clearing all data for fresh start...');
      JwtTokenUtils.clearJwtData();
      localStorage.clear();
      console.log('✅ [TestUserSimulator] Fresh start setup complete');
    }
  };

  /**
   * Quick method to list all available scenarios
   */
  static listScenarios(): void {
    console.log('🧪 Available test scenarios:');
    console.log('TestUserSimulator.scenarios.freshUser()         - New user, needs initial survey');
    console.log('TestUserSimulator.scenarios.surveyCompleted()   - Completed survey, needs bank link');
    console.log('TestUserSimulator.scenarios.bankLinked()        - Bank linked, needs investment survey');
    console.log('TestUserSimulator.scenarios.atInvestmentSurvey() - Ready for investment setup');
    console.log('TestUserSimulator.scenarios.needsStockSelection() - Chose manual stocks');
    console.log('TestUserSimulator.scenarios.needsConfirmation()  - Needs final confirmation');
    console.log('TestUserSimulator.scenarios.completedUser()     - All done, should see main app');
    console.log('TestUserSimulator.scenarios.expiringSoon()      - Session expires in 2 minutes');
    console.log('TestUserSimulator.scenarios.freshStart()       - Clear everything');
  }
}
