export type TagGroups = {
  artist: string[]
  copyright: string[]
  character: string[]
  general: string[]
  meta: string[]
}

export type ExternalPost = {
  id: number
  title: string
  image_url: string
  download_url: string
  source: string | null
  source_url: string | null
  work_name: string | null
  character_name: string | null
  rating: string
  score: number
  width: number | null
  height: number | null
  tags_by_type: TagGroups
  md5: string | null
}

function emptyTagGroups(): TagGroups {
  return {
    artist: [],
    copyright: [],
    character: [],
    general: [],
    meta: [],
  }
}

function pickFirstString(values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

function splitTagString(value: unknown): string[] {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(/\s+/)
    .map((tag) => tag.trim())
    .filter(Boolean)
}

function getStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    const output: string[] = []

    for (const entry of value) {
      if (typeof entry === 'string' && entry.trim()) {
        output.push(entry.trim())
        continue
      }

      if (
        entry &&
        typeof entry === 'object' &&
        'name' in entry &&
        typeof (entry as { name?: unknown }).name === 'string'
      ) {
        output.push((entry as { name: string }).name.trim())
      }
    }

    return output.filter(Boolean)
  }

  return splitTagString(value)
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

function normalizeRating(value: unknown): string {
  if (typeof value !== 'string') {
    return 'unknown'
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === 'e') return 'explicit'
  if (normalized === 'q') return 'questionable'
  if (normalized === 's') return 'safe'

  return normalized || 'unknown'
}

function normalizeTagType(value: unknown): keyof TagGroups | null {
  if (typeof value === 'number') {
    if (value === 1) return 'artist'
    if (value === 3) return 'copyright'
    if (value === 4) return 'character'
    if (value === 5) return 'meta'
    return 'general'
  }

  if (typeof value !== 'string') {
    return null
  }

  const normalized = value.trim().toLowerCase()

  if (normalized === 'artist' || normalized === 'artists') return 'artist'
  if (normalized === 'copyright' || normalized === 'copyrights' || normalized === 'copy') return 'copyright'
  if (normalized === 'character' || normalized === 'characters' || normalized === 'char') return 'character'
  if (normalized === 'meta' || normalized === 'metadata' || normalized === 'metatag' || normalized === 'metatags') return 'meta'
  if (normalized === 'general' || normalized === 'tag' || normalized === 'tags') return 'general'

  const parsed = Number(normalized)
  if (Number.isFinite(parsed)) {
    return normalizeTagType(parsed)
  }

  return null
}

function addTags(target: string[], tags: string[]) {
  for (const tag of tags) {
    if (!target.includes(tag)) {
      target.push(tag)
    }
  }
}

function extractTagGroups(raw: Record<string, unknown>): TagGroups {
  const groups = emptyTagGroups()

  addTags(groups.artist, getStringArray(raw.tag_string_artist))
  addTags(groups.artist, getStringArray(raw.artist))
  addTags(groups.artist, getStringArray(raw.artists))
  addTags(groups.artist, getStringArray(raw.artist_tags))

  addTags(groups.copyright, getStringArray(raw.tag_string_copyright))
  addTags(groups.copyright, getStringArray(raw.copyright))
  addTags(groups.copyright, getStringArray(raw.copyrights))
  addTags(groups.copyright, getStringArray(raw.copyright_tags))

  addTags(groups.character, getStringArray(raw.tag_string_character))
  addTags(groups.character, getStringArray(raw.character))
  addTags(groups.character, getStringArray(raw.characters))
  addTags(groups.character, getStringArray(raw.character_tags))

  addTags(groups.general, getStringArray(raw.tag_string_general))
  addTags(groups.general, getStringArray(raw.general_tags))

  addTags(groups.meta, getStringArray(raw.tag_string_meta))
  addTags(groups.meta, getStringArray(raw.meta_tags))
  addTags(groups.meta, getStringArray(raw.metadata_tags))

  const tagInfoCandidates = [raw.tag_info, raw.tags_info, raw.taginfo]

  for (const info of tagInfoCandidates) {
    if (!info) {
      continue
    }

    if (Array.isArray(info)) {
      for (const entry of info) {
        if (!entry || typeof entry !== 'object') {
          continue
        }

        const item = entry as { name?: unknown; tag?: unknown; type?: unknown }
        const tagName =
          typeof item.name === 'string'
            ? item.name
            : typeof item.tag === 'string'
              ? item.tag
              : null

        const tagType = normalizeTagType(item.type)

        if (tagName && tagType) {
          addTags(groups[tagType], [tagName])
        }
      }

      continue
    }

    if (typeof info === 'object') {
      for (const [key, value] of Object.entries(info)) {
        const categoryType = normalizeTagType(key)

        if (categoryType) {
          addTags(groups[categoryType], getStringArray(value))
          continue
        }

        const mappedType = normalizeTagType(value)
        if (mappedType) {
          addTags(groups[mappedType], [key])
        }
      }
    }
  }

  const allTags = getStringArray(raw.tags).length
    ? getStringArray(raw.tags)
    : getStringArray(raw.tag_string)

  if (allTags.length) {
    const knownTags = new Set([
      ...groups.artist,
      ...groups.copyright,
      ...groups.character,
      ...groups.meta,
    ])

    const generalFallback = allTags.filter((tag) => !knownTags.has(tag))
    addTags(groups.general, generalFallback)
  }

  return groups
}

function normalizeOne(raw: Record<string, unknown>, index: number): ExternalPost | null {
  const id = toNumber(raw.id) ?? toNumber(raw.post_id) ?? index + 1

  const previewUrl = pickFirstString([
    raw.sample_url,
    raw.preview_url,
    raw.jpeg_url,
    raw.file_url,
    raw.image_url,
    raw.image,
  ])

  const downloadUrl = pickFirstString([
    raw.file_url,
    raw.image_url,
    raw.image,
    raw.sample_url,
    raw.preview_url,
    raw.jpeg_url,
  ])

  if (!previewUrl || !downloadUrl) {
    return null
  }

  const tagsByType = extractTagGroups(raw)
  const workName = tagsByType.copyright[0] ?? null
  const characterName = tagsByType.character[0] ?? null
  const title = characterName ?? workName ?? `post-${id}`
  const score = toNumber(raw.score) ?? toNumber(raw.total_score) ?? 0
  const width = toNumber(raw.width) ?? toNumber(raw.image_width)
  const height = toNumber(raw.height) ?? toNumber(raw.image_height)
  const sourceUrl = pickFirstString([raw.source])

  return {
    id,
    title,
    image_url: previewUrl,
    download_url: downloadUrl,
    source: 'Rule34',
    source_url: sourceUrl,
    work_name: workName,
    character_name: characterName,
    rating: normalizeRating(pickFirstString([raw.rating, raw.rate]) ?? 'unknown'),
    score,
    width,
    height,
    tags_by_type: tagsByType,
    md5: pickFirstString([raw.md5]),
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
