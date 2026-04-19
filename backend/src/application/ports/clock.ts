/**
 * Port pra relógio. Injetado onde o use case precisa de `now()`.
 * Testes podem injetar `FixedClock('2026-04-19T12:00:00Z')` em vez de usar `new Date()`.
 */
export interface Clock {
  now(): Date;
}
