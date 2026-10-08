/** Spanish-friendly matching without modifying displayed names or ticker values. */
export function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}
