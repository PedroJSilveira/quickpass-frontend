import { Provider } from '@angular/core';
import { KycProvider, MockKycProvider } from './kyc.provider';
import { MockPaymentGateway, PaymentGateway } from './payment.gateway';

/**
 * Ligação dos adapters externos. Troque os `useClass` pelos provedores reais
 * (KYC/biometria, gateway com pré-autorização) quando definidos (§14.3).
 */
export const ADAPTER_PROVIDERS: Provider[] = [
  { provide: KycProvider, useClass: MockKycProvider },
  { provide: PaymentGateway, useClass: MockPaymentGateway },
];
