import { useEffect, useState } from 'preact/hooks'

/** true mientras la media query coincide (p. ej. '(min-width: 600px)'). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => (typeof matchMedia === 'undefined' ? false : matchMedia(query).matches))
  useEffect(() => {
    const mq = matchMedia(query)
    const onChange = () => setMatches(mq.matches)
    mq.addEventListener('change', onChange)
    onChange()
    return () => mq.removeEventListener('change', onChange)
  }, [query])
  return matches
}

/** ≥ 600 px (medium y expanded en M3). */
export const useIsWide = () => useMediaQuery('(min-width: 600px)')
