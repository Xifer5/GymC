/** Código de país de Bolivia, se antepone a los números locales de 8 dígitos. */
const COUNTRY = '591'

/** Solo dígitos del teléfono, listo para `wa.me`. `null` si no parece un número válido. */
export function whatsappNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 8) return COUNTRY + digits
  if (digits.startsWith(COUNTRY) && digits.length === 11) return digits
  if (digits.length >= 10 && digits.length <= 15) return digits // otro país, ya con código
  return null
}

export function whatsappUrl(phone: string, text?: string): string | null {
  const n = whatsappNumber(phone)
  if (!n) return null
  return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ''}`
}

export function telUrl(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`
}
