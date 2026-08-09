export const APP_URL =
  (import.meta.env.WXT_APP_URL as string | undefined)?.replace(/\/$/, '') ||
  'http://localhost:3000';
