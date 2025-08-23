# KYC Verification Integration - Persona Configuration

This document describes how to configure the Persona identity verification integration for KYC/AML compliance.

## Environment Configuration

The Persona integration requires the following configuration values in your environment files:

### Development Environment (`environment.ts`)
```typescript
persona: {
  templateId: 'PERSONA_TEMPLATE_ID', // Replace with actual template ID from Persona dashboard
  environmentId: 'sandbox',
  version: 'v4.11.0'
}
```

### Production Environment (`environment.prod.ts`)
```typescript
persona: {
  templateId: 'PERSONA_TEMPLATE_ID_PROD', // Replace with production template ID
  environmentId: 'production', 
  version: 'v4.11.0'
}
```

## Persona Dashboard Setup

1. **Create Persona Account**: Sign up at [withpersona.com](https://withpersona.com)

2. **Create Inquiry Templates**:
   - Create templates for different environments (sandbox/production)
   - Configure for KYC/AML compliance requirements:
     - Identity verification (government ID)
     - Address verification
     - PEP (Politically Exposed Person) screening

3. **Get Template IDs**:
   - Copy the template IDs from your Persona dashboard
   - Replace the placeholder values in environment files

4. **Webhook Configuration** (Optional):
   - Set up webhooks in Persona dashboard to receive verification status updates
   - Configure webhook URL to point to your backend API

## Template Configuration

Recommended template configuration for brokerage KYC compliance:

- **Identity Verification**: Government-issued photo ID
- **Address Verification**: Utility bill or bank statement
- **PEP Screening**: Check against PEP lists
- **Document Quality Checks**: Ensure document authenticity
- **Liveness Detection**: Prevent spoofing attacks

## Integration Flow

1. User clicks "Start Identity Verification"
2. Frontend calls `/api/kyc/start` to create verification record
3. Persona SDK is initialized with template ID and reference ID
4. User completes verification in Persona embedded flow
5. Results are sent to backend via `/api/kyc/verify` endpoint
6. User's KYC status is updated and they proceed to next step

## Security Considerations

- Template IDs are public and can be exposed in frontend code
- Sensitive verification data is handled by Persona and your backend
- Always validate verification results on the server side
- Store verification status securely in your database
- Implement proper authentication checks for all KYC endpoints

## Testing

- Use sandbox environment for development and testing
- Persona provides test documents for various scenarios
- Test both successful and failed verification flows
- Verify proper error handling and user experience