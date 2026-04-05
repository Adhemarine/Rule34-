import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { normalizeExternalPosts } from '@/lib/normalize-external-posts'

const demoPosts = [
  {
    id: 1,
    title: '2B alternate outfit',
    image_url: 'https://placehold.co/600x800?text=2B',
    download_url: 'https://placehold.co/600x800?text=2B',
    source: 'Pixiv',
    source_url: null,
    work_name: 'NieR:Automata',
    character_name: '2B',
    rating: 'explicit',
    score: 1280,
    width: 1600,
    height: 2400,
    tags_by_type: {
      artist: ['demo_artist'],
      copyright: ['nier_automata'],
      character: ['2b'],
      general: ['white_hair', 'android'],
      meta: ['demo_post'],
    },
    md5: null,
  },
  {
    id: 2,
    title: 'Rapi night scene',
    image_url: 'https://placehold.co/600x800?text=Rapi',
    download_url: 'https://placehold.co/600x800?text=Rapi',
    source: 'Danbooru',
    source_url: null,
    work_name: 'NIKKE',
    character_name: 'Rapi',
    rating: 'questionable',
    score: 943,
    width: 1920,
    height: 1080,
    tags_by_type: {
      artist: ['demo_artist'],
      copyright: ['nikke'],
      character: ['rapi'],
      general: ['red_eyes', 'military'],
      meta: ['demo_post'],
    },
    md5: null,
  },
]

type SortMode = 'score_desc' | 'id_desc' | 'id_asc' | 'random'

function getSortToken(sortMode: string | null): string {
  if (sortMode === 'id_desc') return 'sort:id:desc'
  if (sortMode === 'id_asc') return 'sort:id:asc'
  if (sortMode === 'random') return 'sort:random'
  return 'sort:score:desc'
}

function buildTagQuery(requestUrl: URL): string {
  const parts: string[] = []

  const tags = requestUrl.searchParams.get('tags')?.trim()
  const rating = requestUrl.searchParams.get('rating')?.trim()
  const minScore = requestUrl.searchParams.get('min_score')?.trim()
  const minWidth = requestUrl.searchParams.get('min_width')?.trim()
  const minHeight = requestUrl.searchParams.get('min_height')?.trim()
  const uploader = requestUrl.searchParams.get('user')?.trim()
  const sourceDomain = requestUrl.searchParams.get('source_domain')?.trim()
  const sortMode = requestUrl.searchParams.get('sort')

  if (tags) parts.push(tags)
  if (rating && rating !== 'all') parts.push(`rating:${rating}`)
  if (minScore) parts.push(`score:>=${minScore}`)
  if (minWidth) parts.push(`width:>=${minWidth}`)
  if (minHeight) parts.push(`height:>=${minHeight}`)
  if (uploader) parts.push(`user:${uploader}`)
  if (sourceDomain) parts.push(`sourcedomains:${sourceDomain}`)

  parts.push(getSortToken(sortMode))

  return parts.join(' ').trim()
}

async function fetchRule34Posts(request: Request) {
  const requestUrl = new URL(request.url)
  const limitParam = Number(requestUrl.searchParams.get('limit') ?? '100')
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 100
  const pidParam = Number(requestUrl.searchParams.get('pid') ?? '0')
  const pid = Number.isFinite(pidParam)
    ? Math.max(pidParam, 0)
    : 0

  const apiUrl = new URL('https://api.rule34.xxx/index.php')
  apiUrl.searchParams.set('page', 'dapi')
  apiUrl.searchParams.set('s', 'post')
  apiUrl.searchParams.set('q', 'index')
  apiUrl.searchParams.set('json', '1')
  apiUrl.searchParams.set('limit', String(limit))
  apiUrl.searchParams.set('pid', String(pid))
  apiUrl.searchParams.set('fields', 'tag_info')

  const tagQuery = buildTagQuery(requestUrl)
  if (tagQuery) {
    apiUrl.searchParams.set('tags', tagQuery)
  }

  const userId = process.env.RULE34_USER_ID
  const apiKey = process.env.RULE34_API_KEY

  if (userId && apiKey) {
    apiUrl.searchParams.set('user_id', userId)
    apiUrl.searchParams.set('api_key', apiKey)
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'rule34-plus-local-dev/0.1',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      console.error('[rule34 api] bad status', response.status, response.statusText)
      return null
    }

    const payload = await response.json()

    if (
      payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      (((payload as { success?: string | boolean }).success === false) ||
        ((payload as { success?: string | boolean }).success === 'false'))
    ) {
      console.error('[rule34 api] success=false payload', payload)
      return null
    }

    const posts = normalizeExternalPosts(payload)
    return posts
  } catch (error) {
    console.error('[rule34 api] fetch failed', error)
    return null
  }
}

export async function GET(request: Request) {
  const rule34Posts = await fetchRule34Posts(request)

  if (rule34Posts !== null) {
    return NextResponse.json(rule34Posts)
  }

  const requestUrl = new URL(request.url)
  const sortMode = requestUrl.searchParams.get('sort')
  const supabase = getSupabaseClient()

  const limitParam = Number(requestUrl.searchParams.get('limit') ?? '100')
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 100

  const pidParam = Number(requestUrl.searchParams.get('pid') ?? '0')
  const pid = Number.isFinite(pidParam)
    ? Math.max(pidParam, 0)
    : 0

  if (!supabase) {
    return NextResponse.json(demoPosts)
  }

  let query = supabase.from('posts').select('*')

  if (sortMode === 'id_asc') {
    query = query.order('id', { ascending: true })
  } else if (sortMode === 'id_desc') {
    query = query.order('id', { ascending: false })
  } else {
    query = query.order('score', { ascending: false })
  }

  query = query.range(pid * limit, pid * limit + limit - 1)

  const { data, error } = await query

  if (error) {
    return NextResponse.json(demoPosts)
  }

  return NextResponse.json(data ?? [])
}
