import { ForbiddenException } from '@nestjs/common';
import { FedaPayService } from './fedapay.service';
import { PremiumGuard } from './guards/premium.guard';
import { PlanAbonnementEnum } from './entities/abonnement.entity';

jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn(),
}));

describe('FedaPayService & PremiumGuard', () => {
  const createConfigMock = (values: Record<string, string | undefined>) => ({
    get: jest.fn((key: string) => values[key]),
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rejette les transactions simulées FEDASIM- en mode live', async () => {
    const service = new FedaPayService(
      createConfigMock({
        FEDAPAY_ENVIRONMENT: 'live',
        FEDAPAY_SECRET_KEY: 'sk_live_test_key',
      }) as any,
    );

    const res = await service.verifyTransaction('FEDASIM-MEN-12345');
    expect(res.approved).toBe(false);
    expect(res.status).toBe('rejected_simulation');
  });

  it('retourne 10000 XOF pour FEDASIM-ANN- et 1000 XOF pour FEDASIM-MEN- en sandbox', async () => {
    const service = new FedaPayService(
      createConfigMock({
        FEDAPAY_ENVIRONMENT: 'sandbox',
      }) as any,
    );

    const annual = await service.verifyTransaction('FEDASIM-ANN-12345');
    const monthly = await service.verifyTransaction('FEDASIM-MEN-12345');
    expect(annual.approved).toBe(true);
    expect(annual.amount).toBe(10000);
    expect(monthly.approved).toBe(true);
    expect(monthly.amount).toBe(1000);
  });

  it('parse correctement la clé JSON "v1/transaction" renvoyée par FedaPay API v1', async () => {
    const service = new FedaPayService(
      createConfigMock({
        FEDAPAY_ENVIRONMENT: 'live',
        FEDAPAY_SECRET_KEY: 'sk_live_test_key',
      }) as any,
    );

    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          'v1/transaction': { id: 987654, status: 'pending' },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'tok_abc',
          url: 'https://process.fedapay.com/tok_abc',
        }),
      });
    (global as any).fetch = fetchMock;

    const result = await service.initiatePayment(
      { id: 'user-1', email: 'test@example.com' } as any,
      PlanAbonnementEnum.PREMIUM_ANNUEL,
      'mtn',
      '97000000',
    );

    expect(result.transactionId).toBe('987654');
    expect(result.checkoutUrl).toBe('https://process.fedapay.com/tok_abc');
    expect(result.amount).toBe(10000);
    expect(result.mode).toBe('fedapay_live');
  });

  it('PremiumGuard bloque les comptes gratuits restreints et autorise les comptes Premium', async () => {
    const mockSubService = {
      shouldRestrictFreeUser: jest
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false),
    };
    const guard = new PremiumGuard(mockSubService as any);
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'user-1' } }),
      }),
    } as any;

    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });
});

