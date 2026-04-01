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

async function fetchExternalPosts() {
  const sourceUrl = process.env.EXTERNAL_POSTS_URL

  if (!sourceUrl) {
    return null
  }

  try {
    const response = await fetch(sourceUrl, {
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
    const posts = normalizeExternalPosts(payload)

    if (!posts.length) {
      return null
    }

    return posts
  } catch {
    return null
  }
}

export async function GET() {
  const externalPosts = await fetchExternalPosts()

  if (externalPosts) {
    return NextResponse.json(externalPosts)
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
