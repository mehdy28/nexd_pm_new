export type Priority = "Low" | "Medium" | "High"

export type Card = {
  id: string
  title: string
  description?: string
  priority?: Priority
  due?: string
  points?: number
  editing?: boolean
}

export type Column = {
  id: string
  title: string
  editing?: boolean
  cards: Card[]
}
