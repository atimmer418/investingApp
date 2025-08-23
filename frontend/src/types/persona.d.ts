// frontend/src/types/persona.d.ts
declare global {
  interface Window {
    Persona?: {
      Client: new (config: PersonaClientConfig) => PersonaClient;
    };
  }
}

export interface PersonaClientConfig {
  templateId: string;
  environmentId: string;
  referenceId?: string;
  onReady?: () => void;
  onComplete?: (inquiryId: string, status: string, fields: any) => void;
  onCancel?: (inquiryId: string, sessionToken: string) => void;
  onError?: (error: PersonaError) => void;
}

export interface PersonaClient {
  open: () => void;
  exit: (force?: boolean) => void;
}

export interface PersonaError {
  code: string;
  message: string;
}

export interface PersonaCompletionData {
  inquiryId: string;
  status: 'completed' | 'failed' | 'needs_review';
  fields: {
    [key: string]: any;
  };
}

export {};