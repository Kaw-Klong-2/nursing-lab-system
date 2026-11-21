/**
 * Escapes HTML special characters to prevent Stored/Reflected XSS
 * when interpolating dynamic database/user values into HTML strings
 * (e.g., print windows via document.write or server-rendered HTML cards).
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
