import source from './tokens.json';

/** Portable token values; no React dependency. Provenance remains in tokens.json. */
export const tokens = source;
export const colors = Object.fromEntries(
  Object.entries(source.color).map(([key, token]) => [key, token.$value]),
) as { [K in keyof typeof source.color]: (typeof source.color)[K]['$value'] };
export type ColorToken = keyof typeof source.color;
export type SpacingToken = keyof typeof source.space;
