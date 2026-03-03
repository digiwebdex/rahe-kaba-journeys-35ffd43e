/**
 * Normalize a Bangladeshi phone number.
 * Converts +880XXXXXXXXXX or 880XXXXXXXXXX to 01XXXXXXXXX.
 * Strips non-digit characters.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  // +880 1XXXXXXXXX → 01XXXXXXXXX
  if (digits.startsWith("880") && digits.length === 13) {
    return "0" + digits.slice(3);
  }
  return digits;
}

/**
 * Validate a Bangladeshi mobile number.
 * Must start with "01" and be exactly 11 digits.
 */
export function isValidBDPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return /^01\d{9}$/.test(normalized);
}

/**
 * Get validation error message for an invalid phone number, or null if valid.
 * Returns null for empty strings (optional fields).
 */
export function getPhoneError(phone: string, required = false): string | null {
  const trimmed = phone.trim();
  if (!trimmed) return required ? "Phone number is required." : null;
  const normalized = normalizePhone(trimmed);
  if (!/^\d+$/.test(normalized)) return "Phone must contain only digits.";
  if (!normalized.startsWith("01")) return "Phone must start with 01.";
  if (normalized.length !== 11) return "Phone must be exactly 11 digits.";
  return null;
}

/**
 * Phone input onChange handler that auto-normalizes +880 format.
 */
export function handlePhoneChange(
  value: string,
  setter: (val: string) => void
) {
  // Auto-convert on paste or full entry of +880 format
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+880") && digits.replace(/[^\d]/g, "").length >= 13) {
    setter(normalizePhone(digits));
  } else if (digits.startsWith("880") && digits.replace(/[^\d]/g, "").length >= 13) {
    setter(normalizePhone(digits));
  } else {
    setter(value);
  }
}
