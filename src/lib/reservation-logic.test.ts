import { describe, expect, it } from "vitest";
import { buildWhatsAppMessage, computeQuote, rentalDays, toBusinessDate, validateDates, whatsappUrl } from "./reservation-logic";

describe("reservation rules", () => {
  it("counts every started 24h block as a day", () => {
    expect(rentalDays(toBusinessDate("2026-12-01", "10:00"), toBusinessDate("2026-12-05", "10:00"))).toBe(4);
    expect(rentalDays(toBusinessDate("2026-12-01", "10:00"), toBusinessDate("2026-12-05", "11:00"))).toBe(5);
    expect(rentalDays(toBusinessDate("2026-12-01", "10:00"), toBusinessDate("2026-12-01", "12:00"))).toBe(1);
  });
  it("rejects past pickup and return before pickup", () => {
    const now = new Date("2026-11-20T15:00:00Z");
    expect(validateDates({ pickupDate: "2026-11-19", pickupTime: "10:00", returnDate: "2026-11-25", returnTime: "10:00" }, now)).toBe("past");
    expect(validateDates({ pickupDate: "2026-12-05", pickupTime: "10:00", returnDate: "2026-12-01", returnTime: "10:00" }, now)).toBe("order");
    expect(validateDates({ pickupDate: "2026-12-01", pickupTime: "10:00", returnDate: "", returnTime: "10:00" }, now)).toBe("missing");
  });
  it("prices only from daily rate × days, deposit by percent or fixed", () => {
    expect(computeQuote(100000, 4, { deposit_type: "percent", deposit_value: 25 })).toEqual({ days: 4, dailyPrice: 100000, total: 400000, deposit: 100000, remaining: 300000 });
    expect(computeQuote(100000, 4, { deposit_type: "fixed", deposit_value: 50000 }).remaining).toBe(350000);
    expect(computeQuote(null, 4, { deposit_type: "percent", deposit_value: 25 }).total).toBeNull();
    expect(computeQuote(100000, 4, { deposit_type: null, deposit_value: null }).deposit).toBeNull();
  });
  it("whatsapp link encodes the full message", () => {
    const msg = buildWhatsAppMessage({
      reservationNumber: "DVR-2026-0001",
      customer: { firstName: "Juan", lastName: "Pérez", dni: "35000000", phone: "111", whatsapp: "111", email: "j@e.com", country: "Argentina" },
      vehicle: { brand: "Renault", model: "Logan", year: 2024 },
      pickup: { date: "2026-12-01", time: "10:00", type: "hotel", address: "Av. Roca 123", city: "General Roca" },
      ret: { date: "2026-12-05", time: "10:00", type: "aeropuerto", address: "Aeropuerto", city: "Neuquén" },
      quote: computeQuote(100000, 4, { deposit_type: "percent", deposit_value: 25 }),
    });
    expect(msg).toContain("DVR-2026-0001");
    expect(msg).toContain("Aeropuerto");
    const url = whatsappUrl("+54 9 298 456-7890", msg);
    expect(url.startsWith("https://wa.me/5492984567890?text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1]!)).toBe(msg);
  });
});
