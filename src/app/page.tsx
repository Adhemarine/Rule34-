'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { ExternalPost } from '@/lib/normalize-external-posts'

type SortMode = 'score_desc' | 'id_desc' | 'id_asc' | 'random'

const PAGE_SIZE = 100

const quickSearches = [
  '2b',
  'raiden_shogun',
  'nikke',
  'blue_archive',
  'frieren',
  'honkai_star_rail',
]

function normalizeSortMode(value: string | null): SortMode {
  if (value === 'id_desc') return 'id_desc'
  if (value === 'id_asc') return 'id_asc'
  if (value === 'random') return 'random'
  return 'score_desc'
}

function readPageIndex(value: string | null): number {
  const parsed = Number(value ?? '0')

  if (!Number.isFinite(parsed)) {
    return 0
  }

  return Math.max(Math.floor(parsed), 0)
}

function buildSearchParams(
  currentQueryString: string,
  updates: Record<string, string | null>,
): URLSearchParams {
  const next = new URLSearchParams(currentQueryString)

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value.trim() === '') {
      next.delete(key)
      continue
    }

    next.set(key, value)
  }

  return next
}

function formatRating(rating: string): string {
  if (rating === 'explicit') return 'E'
  if (rating === 'questionable') return 'Q'
  if (rating === 'safe') return 'S'
  return '?'
}

function getResolutionText(post: ExternalPost): string {
  if (post.width && post.height) {
    return `${post.width}×${post.height}`
  }

  return 'サイズ不明'
}

function getPreviewTags(post: ExternalPost): string[] {
  const merged = [
    ...post.tags_by_type.character,
    ...post.tags_by_type.copyright,
    ...post.tags_by_type.general,
  ]

  return [...new Set(merged)].slice(0, 8)
}

export default function Page() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentQueryString = searchParams.toString()

  const currentTags = searchParams.get('tags') ?? ''
  const currentSort = useMemo(
    () => normalizeSortMode(searchParams.get('sort')),
    [currentQueryString],
  )
  const currentPid = useMemo(
    () => readPageIndex(searchParams.get('pid')),
    [currentQueryString],
  )

  const [searchInput, setSearchInput] = useState(currentTags)
  const [posts, setPosts] = useState<ExternalPost[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedPost, setSelectedPost] = useState<ExternalPost | null>(null)

  useEffect(() => {
    setSearchInput(currentTags)
  }, [currentTags])

  useEffect(() => {
    setSelectedPost(null)
  }, [currentQueryString])

  useEffect(() => {
    let cancelled = false

    async function loadPosts() {
      setLoading(true)
      setError('')

      try {
        const apiParams = new URLSearchParams(currentQueryString)

        if (!apiParams.get('limit')) {
          apiParams.set('limit', String(PAGE_SIZE))
        }

        const response = await fetch(`/api/posts?${apiParams.toString()}`, {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const payload = await response.json()

        if (!cancelled) {
          setPosts(Array.isArray(payload) ? payload : [])
        }
      } catch (loadError) {
        console.error(loadError)

        if (!cancelled) {
          setPosts([])
          setError('投稿の取得に失敗しました。')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPosts()

    return () => {
      cancelled = true
    }
  }, [currentQueryString])

  function replaceParams(updates: Record<string, string | null>) {
    const next = buildSearchParams(currentQueryString, updates)

    if (!next.get('limit')) {
      next.set('limit', String(PAGE_SIZE))
    }

    const nextQuery = next.toString()
    router.replace(nextQuery ? `/?${nextQuery}` : '/')
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    replaceParams({
      tags: searchInput.trim() || null,
      pid: '0',
    })
  }

  function handleSortChange(nextSort: SortMode) {
    replaceParams({
      sort: nextSort === 'score_desc' ? null : nextSort,
      pid: '0',
    })
  }

  function handleGoPrev() {
    if (currentPid <= 0) return

    replaceParams({
      pid: String(currentPid - 1),
    })
  }

  function handleGoNext() {
    if (posts.length < PAGE_SIZE) return

    replaceParams({
      pid: String(currentPid + 1),
    })
  }

  function handleReset() {
    router.replace('/')
  }

  function handleApplyTag(tag: string) {
    replaceParams({
      tags: tag,
      pid: '0',
    })
  }

  const hasPrev = currentPid > 0
  const hasNext = posts.length === PAGE_SIZE
  const rangeStart = posts.length > 0 ? currentPid * PAGE_SIZE + 1 : 0
  const rangeEnd = currentPid * PAGE_SIZE + posts.length

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner topbar-search-wrap">
          <a href="/" className="logo">
            rule34+
          </a>

          <form className="search-stack" onSubmit={handleSearchSubmit}>
            <div style={{ display: 'grid', gap: 8 }}>
              <input
                className="search-input"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="タグ検索。例 2b rating:explicit"
              />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1fr) 120px 120px',
                  gap: 8,
                }}
              >
                <select
                  className="sort-select"
                  value={currentSort}
                  onChange={(event) =>
                    handleSortChange(event.target.value as SortMode)
                  }
                >
                  <option value="score_desc">人気順</option>
                  <option value="id_desc">新しい順</option>
                  <option value="id_asc">古い順</option>
                  <option value="random">ランダム</option>
                </select>

                <button type="submit" className="action-button">
                  検索
                </button>

                <button
                  type="button"
                  className="action-button"
                  onClick={handleReset}
                >
                  リセット
                </button>
              </div>
            </div>
          </form>
        </div>
      </header>

      <main className="main-grid">
        <aside>
          <div className="sidebar-card">
            <h2 className="section-title">よく使う検索</h2>

            <div className="cheatsheet-list">
              {quickSearches.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="cheatsheet-item"
                  onClick={() => handleApplyTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-card">
            <h2 className="section-title">ページ送り確認点</h2>
            <p className="side-note">
              1ページ100件です。前へは pid が 1 以上で有効になります。次へは取得件数が100件ちょうどのときだけ有効にしています。
            </p>
          </div>
        </aside>

        <section>
          <div className="content-header">
            <div>
              <h1 className="section-title" style={{ marginBottom: 4 }}>
                投稿一覧
              </h1>
              <p className="content-subtitle">
                {posts.length > 0
                  ? `${rangeStart}件目から${rangeEnd}件目`
                  : '表示できる投稿がありません'}
              </p>
            </div>

            <div className="button-row">
              <button
                type="button"
                className="action-button"
                onClick={handleGoPrev}
                disabled={!hasPrev}
              >
                前へ
              </button>

              <button
                type="button"
                className="action-button"
                onClick={handleGoNext}
                disabled={!hasNext}
              >
                次へ
              </button>
            </div>
          </div>

          {loading ? <div className="notice">読み込み中です。</div> : null}
          {error ? <div className="notice error">{error}</div> : null}
          {!loading && !error && posts.length === 0 ? (
            <div className="notice">検索結果は 0 件です。</div>
          ) : null}

          <div className="post-grid">
            {posts.map((post) => (
              <button
                key={post.id}
                type="button"
                className="post-card clickable"
                onClick={() => setSelectedPost(post)}
                style={{ padding: 0, textAlign: 'left' }}
              >
                <div className="post-preview">
                  <img
                    className="post-thumb-media"
                    src={post.image_url}
                    alt={post.title}
                    loading="lazy"
                  />

                  <span className="post-meta-badge left">
                    {formatRating(post.rating)}
                  </span>

                  <span className="post-meta-badge right">★ {post.score}</span>

                  <div className="post-footer">
                    <span>{post.work_name ?? post.title}</span>
                    <span>{getResolutionText(post)}</span>
                  </div>
                </div>

                <div className="post-body compact">
                  <div className="post-card-id">post #{post.id}</div>

                  <div className="detail-tag-list">
                    {getPreviewTags(post).slice(0, 4).map((tag) => (
                      <span key={tag} className="tag-chip tag-chip-label">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {selectedPost ? (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <div>
                <h2 className="section-title" style={{ marginBottom: 4 }}>
                  {selectedPost.title}
                </h2>
                <p className="content-subtitle">post #{selectedPost.id}</p>
              </div>

              <div className="modal-actions">
                <a
                  className="action-button"
                  href={selectedPost.download_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  画像を開く
                </a>

                {selectedPost.source_url ? (
                  <a
                    className="action-button"
                    href={selectedPost.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    元URL
                  </a>
                ) : null}

                <button
                  type="button"
                  className="action-button"
                  onClick={() => setSelectedPost(null)}
                >
                  閉じる
                </button>
              </div>
            </div>

            <div className="modal-grid">
              <div className="modal-image-wrap">
                <img
                  className="modal-image"
                  src={selectedPost.download_url}
                  alt={selectedPost.title}
                />
              </div>

              <div className="modal-side">
                <div className="detail-section">
                  <h3 className="detail-section-title">情報</h3>

                  <div className="detail-meta-list">
                    <div>評価: {selectedPost.rating}</div>
                    <div>スコア: {selectedPost.score}</div>
                    <div>サイズ: {getResolutionText(selectedPost)}</div>
                    <div>作品: {selectedPost.work_name ?? '不明'}</div>
                    <div>キャラ: {selectedPost.character_name ?? '不明'}</div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3 className="detail-section-title">タグ</h3>

                  <div className="detail-tag-list">
                    {getPreviewTags(selectedPost).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className="tag-chip"
                        onClick={() => handleApplyTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
