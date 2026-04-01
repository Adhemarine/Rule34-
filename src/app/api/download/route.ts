import { NextResponse } from 'next/server'

function isAllowedRule34Host(hostname: string): boolean {
  return hostname === 'rule34.xxx' || hostname.endsWith('.rule34.xxx')
}

function getFilenameFromUrl(url: URL): string {
  const lastSegment = url.pathname.split('/').filter(Boolean).pop()
  return lastSegment || 'image'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const rawUrl = requestUrl.searchParams.get('url')
  const requestedFilename = requestUrl.searchParams.get('filename')

  if (!rawUrl) {
    return NextResponse.json({ error: 'url が必要です' }, { status: 400 })
  }

  let targetUrl: URL

  try {
    targetUrl = new URL(rawUrl)
  } catch {
    return NextResponse.json({ error: 'url の形式が不正です' }, { status: 400 })
  }

  if (!['http:', 'https:'].includes(targetUrl.protocol)) {
    return NextResponse.json({ error: 'http か https のみ対応です' }, { status: 400 })
  }

  if (!isAllowedRule34Host(targetUrl.hostname)) {
    return NextResponse.json({ error: 'rule34.xxx 系のURLのみ対応です' }, { status: 400 })
  }

  const upstream = await fetch(targetUrl.toString(), {
    headers: {
      'User-Agent': 'rule34-plus-local-dev/0.1',
    },
    cache: 'no-store',
  })

  if (!upstream.ok) {
    return NextResponse.json({ error: '画像の取得に失敗しました' }, { status: 502 })
  }

  const arrayBuffer = await upstream.arrayBuffer()
  const contentType = upstream.headers.get('content-type') ?? 'application/octet-stream'
  const filename = requestedFilename?.trim() || getFilenameFromUrl(targetUrl)

  return new NextResponse(arrayBuffer, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
