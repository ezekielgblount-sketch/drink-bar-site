import drinksJson from './drinks.json'
import bottlesJson from './bottles.json'
import ingredientsJson from './ingredients.json'
import siteJson from './site.json'

// Every fact on the site carries where it came from. Rendered as links.
export type Source = { label: string; url: string }

export type Ingredient = {
  item: string
  qty: number | null
  unit: string | null
  note?: string
  ref?: string // id of a bottle or ingredient entry that holds its sources
}

export type GlassType = 'rocks' | 'highball' | 'coupe'
export type GarnishType = 'lime' | 'grapefruit' | 'mango'

export type Drink = {
  id: string
  name: string
  signature?: boolean
  house?: boolean // our own recipe: no outside source needed
  story: string
  glass: string
  glassType: GlassType
  garnish: GarnishType
  fizz?: boolean // sparkling: shows rising bubbles
  clear?: boolean // see-through drink (no solid color)
  liquid: string
  rim: 'salt' | 'chili' | null
  ingredients: Ingredient[]
  steps: string[]
  sources: Source[]
}

// null means "not verified" and shows as "unknown".
export type Bottle = {
  id: string
  name: string
  type: string
  abv: string | null
  maker: string | null
  origin: string | null
  price: string | null
  flavor: string | null
  color: string // shelf (2D) bottle color
  height: number
  shape: 'tall' | 'round' | 'stubby'
  glass: string // 3D glass tint
  liquid: string | null // null = clear spirit, no visible liquid
  sources: Source[]
}

export type IngredientInfo = { id: string; name: string; about: string; sources: Source[] }

export const drinks = drinksJson as unknown as Drink[]
export const bottles = bottlesJson as unknown as Bottle[]
export const ingredientInfo = ingredientsJson as IngredientInfo[]
export const site = siteJson

// Where an ingredient's link points: its bottle or ingredient entry's first source.
export function sourceFor(ref?: string): Source | null {
  if (!ref) return null
  const hit = bottles.find((b) => b.id === ref) ?? ingredientInfo.find((i) => i.id === ref)
  return hit?.sources[0] ?? null
}

// When the facts were last checked, shown next to sources.
export const FACTS_CHECKED = 'October 2026'
