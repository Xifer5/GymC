/**
 * Datos de demostración (solo para el mock local). Generan un gimnasio "con vida":
 * socios vigentes, por vencer y vencidos, pagos parciales, un pago anulado, ingresos y egresos de los últimos meses.
 * Determinista: mismo resultado en cada carga (salvo los ids), útil para capturas y demos.
 */
import { addDays, membershipEnd, monthRange } from '../dates'
import type { ISODate } from '../dates'
import type { Cents } from '../money'
import type { DbState, StoredMembership } from './mock'
import type { Category, Member, Movement, Payment, PaymentMethod, Plan } from './types'

const NAMES = [
  'Ana Vega', 'Beto Ríos', 'Carla Mamani', 'Diego Quispe', 'Elena Choque', 'Fabián Rojas', 'Gabriela Flores',
  'Héctor Condori', 'Isabel Vargas', 'Jorge Salazar', 'Karen Gutiérrez', 'Luis Mendoza', 'María Fernández',
  'Nelson Aguilar', 'Olga Terrazas', 'Pablo Cruz', 'Rosa Medina', 'Sergio Limachi', 'Tania Soliz',
  'Ulises Peña', 'Valeria Ortiz', 'Walter Copa', 'Ximena Arce', 'Yolanda Paz', 'Álvaro Nina',
]

/** Generador pseudoaleatorio con semilla (para que la demo sea reproducible). */
function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

type Scenario = 'vigente' | 'porVencer' | 'vencida' | 'quincenal' | 'saldo'

function scenarioFor(i: number): Scenario {
  if (i < 12) return 'vigente'
  if (i < 17) return 'porVencer'
  if (i < 21) return 'vencida'
  if (i < 23) return 'quincenal'
  return 'saldo'
}

export function buildDemoState(base: DbState, today: ISODate): DbState {
  const rand = rng(7)
  const dayOfMonth = Number(today.slice(8, 10))
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]
  const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1))
  const METHODS: PaymentMethod[] = ['cash', 'cash', 'qr', 'transfer']

  const plan = (name: string): Plan => base.plans.find((p) => p.name === name) ?? base.plans[0]
  const mensual = plan('Mensual')
  const quincenal = plan('Quincenal')
  const adminId = (base.users.find((u) => u.role === 'admin') ?? base.users[0]).id
  const recepId = (base.users.find((u) => u.role !== 'admin') ?? base.users[0]).id // cobra la recepción

  const members: Member[] = []
  const memberships: StoredMembership[] = []
  const payments: Omit<Payment, 'receiptNo'>[] = []

  const stamp = (date: ISODate) => `${date}T${String(int(12, 23)).padStart(2, '0')}:${String(int(0, 59)).padStart(2, '0')}:00.000Z`

  function addMembership(memberId: string, p: Plan, start: ISODate, discountCents: Cents, paid: Cents[]): StoredMembership {
    const m: StoredMembership = {
      id: crypto.randomUUID(), memberId, planId: p.id, planName: p.name,
      priceCents: p.priceCents, discountCents, startDate: start,
      endDate: membershipEnd(start, p.durationDays), status: 'active',
    }
    memberships.push(m)
    paid.forEach((amountCents, k) => {
      payments.push({
        id: crypto.randomUUID(), memberId, membershipId: m.id, amountCents,
        method: pick(METHODS), paidAt: stamp(addDays(start, k * 3)), status: 'confirmed',
      })
    })
    return m
  }

  NAMES.forEach((fullName, i) => {
    const sc = scenarioFor(i)
    const id = crypto.randomUUID()
    let start: ISODate
    let p = mensual
    let discount = 0
    let paid: Cents[]

    // Los 8 primeros pagaron este mes (los dos primeros, hoy): el "mes actual" siempre tiene ingresos.
    if (sc === 'vigente') start = addDays(today, i < 2 ? 0 : -int(0, i < 8 ? Math.min(21, dayOfMonth - 1) : 21))
    else if (sc === 'porVencer') start = addDays(today, -int(22, 29))
    else if (sc === 'vencida') start = addDays(today, -int(36, 62))
    else if (sc === 'quincenal') { p = quincenal; start = addDays(today, -int(0, 6)) }
    else start = addDays(today, -int(3, 12)) // con saldo pendiente

    const net = p.priceCents
    paid = [net]
    if (i === 12) { discount = 2000; paid = [net - 2000] } // con descuento
    if (i === 23) paid = [8000] // pagó 80 de 150
    if (i === 24) paid = [10000, 2500] // abonos: 125 de 150

    // Historial: renovaciones anteriores seguidas (los que no son múltiplo de 3 tienen 1 o 2).
    const history = i % 3 === 0 || sc === 'quincenal' ? 0 : 1 + (i % 2)
    let first = start
    for (let h = 1; h <= history; h++) {
      const prevStart = addDays(start, -30 * h)
      addMembership(id, mensual, prevStart, 0, [mensual.priceCents])
      first = prevStart
    }
    addMembership(id, p, start, discount, paid)

    members.push({
      id, fullName, ci: String(6100000 + i * 7919), phone: `7${String(1000000 + i * 91357).slice(0, 7)}`,
      status: 'active', joinedOn: first,
      ...(i === 3 ? { notes: 'Prefiere entrenar en la mañana' } : {}),
      ...(i === 8 ? { email: 'isabel.vargas@example.com' } : {}),
    })
  })

  // Un cobro duplicado ya anulado (Fabián, socio 5): se ve el Estado "Anulado" y no cuenta en caja.
  const dupFor = memberships.filter((m) => m.memberId === members[5].id).pop()
  if (dupFor) {
    payments.push({
      id: crypto.randomUUID(), memberId: dupFor.memberId, membershipId: dupFor.id, amountCents: dupFor.priceCents,
      method: 'cash', paidAt: stamp(dupFor.startDate), status: 'voided', voidReason: 'Cobro duplicado',
      voidedBy: adminId, voidedAt: stamp(dupFor.startDate),
    })
  }

  // Recibos correlativos en orden cronológico.
  const ordered = payments.sort((a, b) => (a.paidAt === b.paidAt ? (a.id < b.id ? -1 : 1) : a.paidAt < b.paidAt ? -1 : 1))
  const numbered: Payment[] = ordered.map((p, k) => ({ ...p, receiptNo: k + 1, createdBy: recepId }))

  // ── Movimientos de caja ──
  const cat = (type: Category['type'], name: string): string | undefined =>
    (base.categories.find((c) => c.type === type && c.name === name) ?? base.categories.find((c) => c.type === type))?.id
  const movements: Movement[] = []
  const move = (type: Movement['type'], catName: string, description: string, amountCents: Cents, method: PaymentMethod, date: ISODate, extra: Partial<Movement> = {}) => {
    const categoryId = cat(type, catName)
    if (!categoryId || date > today) return
    movements.push({
      id: crypto.randomUUID(), type, categoryId, description, amountCents, method,
      occurredOn: date, status: 'confirmed', createdBy: adminId, createdAt: `${date}T13:00:00.000Z`, ...extra,
    })
  }

  let first = monthRange(today).from // primer día del mes en curso; luego cada mes anterior
  for (let back = 0; back <= 2; back++, first = monthRange(addDays(first, -1)).from) {
    const day = (n: number) => addDays(first, n - 1)
    move('expense', 'Alquiler', 'Alquiler del local', 70000, 'transfer', day(2))
    move('expense', 'Servicios', 'Luz y agua', int(26, 36) * 1000, 'cash', day(4))
    move('expense', 'Sueldos', 'Sueldo recepción', 100000, 'transfer', day(28))
  }
  move('expense', 'Mantenimiento', 'Reparación de cinta de correr', 32000, 'cash', addDays(today, -19))
  move('expense', 'Equipos', 'Mancuernas nuevas', 40000, 'transfer', addDays(today, -40))
  move('expense', 'Mantenimiento', 'Compra duplicada de insumos', 15000, 'cash', addDays(today, -6), { status: 'voided', voidReason: 'Compra duplicada', voidedBy: adminId, voidedAt: `${addDays(today, -6)}T18:00:00.000Z` })
  for (let d = -58; d <= 0; d += int(3, 5)) {
    move('income', 'Venta de productos', pick(['Agua y bebidas', 'Proteína (porción)', 'Barras energéticas', 'Guantes de gimnasio']), int(3, 14) * 1000, pick(METHODS), addDays(today, d))
  }
  move('income', 'Venta de productos', 'Agua y bebidas', 6000, 'cash', today) // movimiento hoy
  move('income', 'Otros ingresos', 'Alquiler de casillero', 20000, 'cash', addDays(today, -15))

  return { ...base, members, memberships, payments: numbered, movements, receiptSeq: numbered.length }
}

/** Deja el gimnasio vacío conservando usuarios, planes, categorías y datos del gimnasio. */
export function clearData(base: DbState): DbState {
  return { ...base, members: [], memberships: [], payments: [], movements: [], receiptSeq: 0 }
}
