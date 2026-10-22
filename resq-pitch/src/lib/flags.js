import { opening, gap, evidence, solution, value, model, ask } from '../data/content'

const BY_SLIDE = [opening, gap, evidence, solution, value, model, ask]

/** Number of open [[FLAG]] items on each slide, counted straight from the content file. */
export const openItemsBySlide = BY_SLIDE.map((c) => (JSON.stringify(c).match(/\[\[/g) ?? []).length)
