import { describe, expect, it } from 'vitest';
import { canonicalRequest, reservationInput } from './reservation-input';
import { toBusinessDate, validateDates } from './reservation-logic';
import { vehicleSchema, canTransition } from './admin/rules';

const now = new Date('2026-11-26T15:50:00Z');
const request = {
  idempotencyKey: 'b171b3a8-8f3b-4faa-9719-cc2b461c21e6', vehicleId: 'b9d186d2-9f15-4662-a269-3b83b1020d07',
  pickupDate: '2026-12-01', pickupTime: '10:00', returnDate: '2026-12-05', returnTime: '10:00',
  pickup: { type: 'hotel', address: 'Calle de prueba 1', city: 'General Roca' },
  ret: { type: 'hotel', address: 'Calle de prueba 2', city: 'General Roca' }, sameReturn: true,
  customer: { firstName: 'Prueba', lastName: 'Aislada', dni: '35000000', phone: '5492985000000', whatsapp: '5492985000000', email: 'prueba@example.invalid', country: 'Argentina' },
};
describe('public reservation hardening', () => {
  it('does not accept caller-controlled confirmation status', () => {
    expect(reservationInput.parse({ ...request, status: 'confirmada' })).not.toHaveProperty('status');
  });
  it('does not accept caller-controlled price or totals', () => {
    const parsed = reservationInput.parse({ ...request, dailyPrice: 1, total_amount: 1 });
    expect(parsed).not.toHaveProperty('dailyPrice');
    expect(parsed).not.toHaveProperty('total_amount');
  });
  it('requires a real UUID-format idempotency key', () => {
    expect(reservationInput.safeParse({ ...request, idempotencyKey: 'inventado' }).success).toBe(false);
  });
  it('rejects impossible calendar dates', () => {
    expect(Number.isNaN(toBusinessDate('2027-02-29', '10:00').getTime())).toBe(true);
    expect(validateDates({ ...request, pickupDate: '2027-02-30', returnDate: '2027-03-03' }, now)).toBe('missing');
  });
  it('accepts a leap-year date', () => {
    expect(toBusinessDate('2028-02-29', '10:00').toISOString()).toBe('2028-02-29T13:00:00.000Z');
  });
  it('allows exactly 730 days', () => {
    expect(validateDates({ ...request, pickupDate: '2027-01-01', returnDate: '2028-12-31' }, now)).toBeNull();
  });
  it('rejects more than 730 days', () => {
    expect(validateDates({ ...request, pickupDate: '2027-01-01', returnDate: '2029-01-01' }, now)).toBe('range');
  });
  it('canonicalizes same-location retries identically', () => {
    const a = canonicalRequest(reservationInput.parse(request));
    const b = canonicalRequest(reservationInput.parse({ ...request, pickup: { ...request.pickup, reference: '' }, notes: null }));
    expect(a).toEqual(b);
    expect(a.ret).toEqual(a.pickup);
  });
  it('does not reopen cancelled confirmed periods', () => {
    expect(canTransition('confirmada', 'cancelada')).toBe(true);
    expect(canTransition('cancelada', 'confirmada')).toBe(false);
  });
  it('limits image collections before administrative writes', () => {
    expect(vehicleSchema.shape.images.safeParse(Array(21).fill('https://example.invalid/photo.png')).success).toBe(false);
  });
});