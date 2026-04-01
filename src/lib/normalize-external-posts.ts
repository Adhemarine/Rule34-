export type ExternalPost = {
  id: number
  title: string
  image_url: string
  source: string | null
  work_name: string | null
  character_name: string | null
  rating: string
  score: number
  width: number | null
  height: number | null
}

function pickFirstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return null
}

function normalizeOne(raw: Record<string, unknown>, index: number): ExternalPost | null {
  const id = toNumber(raw.id) ?? toNumber(raw.post_id) ?? index + 1

  const imageUrl = pickFirstString([
    raw.file_url,
    raw.image_url,
    raw.image,
    raw.sample_url,
    raw.preview_url,
    raw.jpeg_url,
  ])

  if (!imageUrl) {
    return null
  }

  const title =
    pickFirstString([raw.title, raw.tag_string, raw.tags, raw.name]) ?? `post-${id}`

  const workName = pickFirstString([
    raw.work_name,
    raw.copyright,
    raw.series,
    raw.franchise,
  ])

  const characterName = pickFirstString([raw.character_name, raw.character])

  const source =
    pickFirstString([raw.source_site, raw.source, raw.site]) ?? 'external'

  const rating = pickFirstString([raw.rating, raw.rate]) ?? 'unknown'

  const score = toNumber(raw.score) ?? toNumber(raw.total_score) ?? 0

  const width = toNumber(raw.width) ?? toNumber(raw.image_width)
  const height = toNumber(raw.height) ?? toNumber(raw.image_height)

  return {
    id,
    title,
    image_url: imageUrl,
    source,
    work_name: workName,
    character_name: characterName,
    rating,
    score,
    width,
    height,
  }
}

export function normalizeExternalPosts(payload: unknown): ExternalPost[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === 'object' &&
        Array.isArray((payload as { posts?: unknown[] }).posts)
      ? (payload as { posts: unknown[] }).posts
      : payload &&
          typeof payload === 'object' &&
          Array.isArray((payload as { data?: unknown[] }).data)
        ? (payload as { data: unknown[] }).data
        : []

  return rows
    .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
    .map((row, index) => normalizeOne(row, index))
    .filter((row): row is ExternalPost => row !== null)
}
