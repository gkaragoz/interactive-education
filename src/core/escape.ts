/** Safe DOM construction: learner text always goes in as text nodes, never as HTML. */

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type Child = Node | string | null | undefined | false;
export type Attrs = Record<string, string | number | boolean | null | undefined | ((ev: Event) => void)>;

/**
 * Hyperscript-style element builder. Strings become text nodes; `on*` attributes take functions;
 * `class` sets the class; boolean attributes are set when true.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (typeof value === 'function') {
      el.addEventListener(key.replace(/^on/, '').toLowerCase(), value);
    } else if (key === 'class') {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, '');
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
  return el;
}

/** Only http(s) links are rendered as links; anything else (javascript:, data:) is dropped. */
export function safeUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}
