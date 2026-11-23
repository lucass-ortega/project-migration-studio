import {describe,it,expect} from 'vitest';
import {blocksAvailability,overlaps,canTransition,settingsSchema} from './rules';
describe('administration business rules',()=>{
 it('confirmed reservations block periods',()=>expect(blocksAvailability('confirmada')).toBe(true));
 it('pending requests do not block periods',()=>expect(blocksAvailability('pendiente_confirmacion')).toBe(false));
 it.each(['rechazada','cancelada','finalizada'])('%s does not block availability',s=>expect(blocksAvailability(s)).toBe(false));
 it('allows delivery exactly when the previous return occurs',()=>expect(overlaps('2026-12-01T10:00:00-03:00','2026-12-05T10:00:00-03:00','2026-12-05T10:00:00-03:00','2026-12-06T10:00:00-03:00')).toBe(false));
 it('detects a one-minute overlap',()=>expect(overlaps('2026-12-01T10:00:00-03:00','2026-12-05T10:00:00-03:00','2026-12-05T09:59:00-03:00','2026-12-06T10:00:00-03:00')).toBe(true));
 it('allows owners to confirm a pending request',()=>expect(canTransition('pendiente_confirmacion','confirmada')).toBe(true));
 it('does not reopen a rejected request',()=>expect(canTransition('rechazada','confirmada')).toBe(false));
 it('rejects percentage deposits above the total',()=>expect(settingsSchema.safeParse({whatsapp_number:'5492985085908',deposit_type:'percent',deposit_value:101}).success).toBe(false));
});
