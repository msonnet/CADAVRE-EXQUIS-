export const VOICES = [
  {
    id: "v1",
    ctxBias: { CONCEPT: 1.35, POETIC: 1.10, NARR: 1.05, TECH: 0.90, ADMIN: 0.95, ORAL: 0.70, MIX: 1.05 },
    insertBias: { HIGH: 1.20, TECH: 0.95, ADMIN: 0.95, ORAL: 0.75 },
    lineLenBias: +1
  },
  {
    id: "v2",
    ctxBias: { POETIC: 1.35, NARR: 1.10, TECH: 1.05, CONCEPT: 0.95, ADMIN: 0.80, ORAL: 0.85, MIX: 1.10 },
    insertBias: { HIGH: 0.95, TECH: 1.05, ADMIN: 0.85, ORAL: 0.85 },
    lineLenBias: 0
  },
  {
    id: "v3",
    ctxBias: { ORAL: 1.15, MIX: 1.25, POETIC: 1.10, CONCEPT: 0.90, TECH: 0.95, ADMIN: 0.85, NARR: 0.95 },
    insertBias: { HIGH: 0.85, TECH: 0.90, ADMIN: 0.85, ORAL: 1.05 },
    lineLenBias: -1
  }
];
