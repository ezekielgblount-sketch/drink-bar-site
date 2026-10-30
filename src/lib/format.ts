import type { Ingredient } from '../data'

// "2 oz", "4.5 oz (to taste)", or just the note for garnishes.
export function formatQty(ing: Ingredient, servings: number): string {
  if (ing.qty === null) return ing.note ?? ''
  const n = Math.round(ing.qty * servings * 100) / 100
  const base = `${n}${ing.unit ? ` ${ing.unit}` : ''}`
  return ing.note ? `${base} (${ing.note})` : base
}
