const ENTITIES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escape any value before it is placed into an HTML string.
export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ENTITIES[character]);
}
