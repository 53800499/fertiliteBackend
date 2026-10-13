jest.mock('@nestjs/passport', () => ({
  AuthGuard: () => class MockAuthGuard {
    canActivate() { return true; }
  },
}));
import { Test, TestingModule } from '@nestjs/testing';
import { FertilityController } from './fertility.controller';
import { CalendarController } from './calendar.controller';
import { FertilityService } from './fertility.service';

describe('Fertility Controllers (Module 4 - M4)', () => {
  let fertilityController: FertilityController;
  let calendarController: CalendarController;

  const mockFertilityService = {
    getCurrentPrediction: jest.fn().mockResolvedValue({
      predictionId: 'pred-1',
      fertilityScoreValue: 75,
      factors: [],
    }),
    getCurrentFactors: jest.fn().mockResolvedValue([
      { type: 'historique_cycles', description: 'Cycles réguliers', weight: 0.45 },
    ]),
    calculateAndSavePrediction: jest.fn().mockResolvedValue({
      predictionId: 'pred-new',
      fertilityScoreValue: 80,
    }),
    getPredictionHistory: jest.fn().mockResolvedValue([]),
    getMonthCalendar: jest.fn().mockResolvedValue({
      year: 2026,
      month: 10,
      days: [],
    }),
    getDayDetail: jest.fn().mockResolvedValue({
      date: '2026-10-15',
      fertility: { score: 80 },
    }),
  };

  const mockUser = {
    userId: 'user-uuid-1',
    email: 'test@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FertilityController, CalendarController],
      providers: [
        { provide: FertilityService, useValue: mockFertilityService },
      ],
    }).compile();

    fertilityController = module.get<FertilityController>(FertilityController);
    calendarController = module.get<CalendarController>(CalendarController);
    jest.clearAllMocks();
  });

  describe('FertilityController', () => {
    it('GET /fertility/current', async () => {
      const res = await fertilityController.getCurrentPrediction(mockUser);
      expect(mockFertilityService.getCurrentPrediction).toHaveBeenCalledWith('user-uuid-1');
      expect(res.predictionId).toBe('pred-1');
    });

    it('GET /fertility/current/factors', async () => {
      const res = await fertilityController.getCurrentFactors(mockUser);
      expect(mockFertilityService.getCurrentFactors).toHaveBeenCalledWith('user-uuid-1');
      expect(res.length).toBe(1);
    });

    it('POST /fertility/recalculate', async () => {
      const res = await fertilityController.recalculate(mockUser, { evaluationDate: '2026-10-14' });
      expect(mockFertilityService.calculateAndSavePrediction).toHaveBeenCalledWith('user-uuid-1', '2026-10-14');
      expect(res.predictionId).toBe('pred-new');
    });
  });

  describe('CalendarController', () => {
    it('GET /calendar/month', async () => {
      const res = await calendarController.getMonthCalendar(mockUser, '2026', '10');
      expect(mockFertilityService.getMonthCalendar).toHaveBeenCalledWith('user-uuid-1', 2026, 10);
      expect(res.month).toBe(10);
    });

    it('GET /calendar/days/:date', async () => {
      const res = await calendarController.getDayDetail(mockUser, '2026-10-15');
      expect(mockFertilityService.getDayDetail).toHaveBeenCalledWith('user-uuid-1', '2026-10-15');
      expect(res.date).toBe('2026-10-15');
    });
  });
});
