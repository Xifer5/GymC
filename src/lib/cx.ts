/** Une clases condicionales: cx('a', cond && 'b'). Evita declarar clases en conflicto. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
