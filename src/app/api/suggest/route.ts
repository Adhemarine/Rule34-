import { NextResponse } from 'next/server'

function normalizeSuggestions(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return []
  }

  const results: string[] = []

  for (const item of payload) {
    if (typeof item === 'string' && item.trim()) {
      results.push(item.trim())
      continue
    }

    if (!item || typeof item !== 'object') {
      continue
    }

    const name =
      typeof (item as { value?: unknown }).value === 'string'
        ? (item as { value: string }).value
        : typeof (item as { label?: unknown }).label === 'string'
          ? (item as { label: string }).label
          : typeof (item as { name?: unknown }).name === 'string'
            ? (item as { name: string }).name
            : null

    if (name?.trim()) {
      results.push(name.trim())
    }
  }

  return [...new Set(results)].slice(0, 8)
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const q = requestUrl.searchParams.get('q')?.trim() ?? ''

  if (!q) {
    return NextResponse.json([])
  }

  try {
    const apiUrl = new URL('https://api.rule34.xxx/autocomplete.php')
    apiUrl.searchParams.set('q', q)

    const response = await fetch(apiUrl.toString(), {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'rule34-plus-local-dev/0.1',
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      return NextResponse.json([])
    }

    const payload = await response.json()
    return NextResponse.json(normalizeSuggestions(payload))
  } catch {
    return NextResponse.json([])
  }
}
