import { NextResponse } from 'next/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import { normalizeExternalPosts } from '@/lib/normalize-external-posts'

const demoPosts = [
  {
    id: 1,
    title: '2B alternate outfit',
    image_url: 'https://placehold.co/600x800?text=2B',
    source: 'Pixiv',
    work_name: 'NieR:Automata',
    character_name: '2B',
    rating: 'explicit',
    score: 1280,
    width: 1600,
    height: 2400,
  },
  {
    id: 2,
    title: 'Rapi night scene',
    image_url: 'https://placehold.co/600x800?text=Rapi',
    source: 'Danbooru',
    work_name: 'NIKKE',
    character_name: 'Rapi',
    rating: 'questionable',
    score: 943,
    width: 1920,
    height: 1080,
  },
  {
    id: 3,
    title: 'Lucy rooftop set',
    image_url: 'https://placehold.co/600x800?text=Lucy',
    source: 'Rule34',
    work_name: 'Cyberpunk: Edgerunners',
    character_name: 'Lucy',
    rating: 'explicit',
    score: 1562,
    width: 2048,
    height: 3072,
  },
]

async function fetchRule34Posts(request: Request) {
  const requestUrl = new URL(request.url)
  const tags = requestUrl.searchParams.get('tags')?.trim() ?? ''
  const limitParam = Number(requestUrl.searchParams.get('limit') ?? '30')
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 100)
    : 30

  const apiUrl = new URL('https://api.rule34.xxx/index.php')
  apiUrl.searchParams.set('page', 'dapi')
  apiUrl.searchParams.set('s', 'post')
  apiUrl.searchParams.set('q', 'index')
  apiUrl.searchParams.set('json', '1')
  apiUrl.searchParams.set('limit', String(limit))

  if (tags) {
    apiUrl.searchParams.set('tags', tags)
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
      },
      next: {
        revalidate: 300,
      },
    })

    if (!response.ok) {
      return null
    }

    const payload = await response.json()

    if (
      payload &&
      typeof payload === 'object' &&
      'success' in payload &&
      (payload as { success?: string | boolean }).success === false
    ) {
      return null
    }

    const posts = normalizeExternalPosts(payload)

    if (!posts.length) {
      return null
    }

    return posts
  } catch {
    return null
  }
}

export async function GET(request: Request) {
  const rule34Posts = await fetchRule34Posts(request)

  if (rule34Posts) {
    return NextResponse.json(rule34Posts)
  }

  const supabase = getSupabaseClient()

  if (!supabase) {
    return NextResponse.json(demoPosts)
  }

  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('score', { ascending: false })

  if (error) {
    return NextResponse.json(demoPosts)
  }

  return NextResponse.json(data)
}
