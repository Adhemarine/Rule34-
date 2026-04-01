'use client'

import { useEffect, useMemo, useState } from 'react'

type TagGroups = {
  artist: string[]
  copyright: string[]
  character: string[]
  general: string[]
  meta: string[]
}

type Post = {
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

type SortMode = 'score_desc' | 'id_desc' | 'id_asc' | 'random'
type RatingFilter = 'all' | 'safe' | 'questionable' | 'explicit'
type TagMenuState = {
  section: string
  tag: string
} | null

const popularTags = ['1girl', 'solo', 'white_hair', 'blue_hair', 'night', 'jacket']
const BOOKMARKS_KEY = 'rule34plus_bookmarks'
const MUTE_TAGS_KEY = 'rule34plus_muted_tags'

function inferMediaKind(url: string): 'video' | 'gif' | 'image' {
  const lower = url.toLowerCase()
  if (lower.includes('.webm') || lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.m4v')) return 'video'
  if (lower.includes('.gif')) return 'gif'
  return 'image'
}

function replaceLastToken(source: string, replacement: string): string {
  const trimmed = source.replace(/\s+$/, '')
  const index = trimmed.lastIndexOf(' ')
  if (index === -1) return replacement
  return `${trimmed.slice(0, index + 1)}${replacement}`
}

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [excludeTags, setExcludeTags] = useState('')
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [mutedTags, setMutedTags] = useState<string[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('score_desc')
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('all')
  const [minScore, setMinScore] = useState('')
  const [minWidth, setMinWidth] = useState('')
  const [minHeight, setMinHeight] = useState('')
  const [uploader, setUploader] = useState('')
  const [sourceDomain, setSourceDomain] = useState('')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [tagMenu, setTagMenu] = useState<TagMenuState>(null)

  useEffect(() => {
    try {
      const bookmarkRaw = localStorage.getItem(BOOKMARKS_KEY)
      const mutedRaw = localStorage.getItem(MUTE_TAGS_KEY)
      if (bookmarkRaw) setBookmarkedIds(JSON.parse(bookmarkRaw))
      if (mutedRaw) setMutedTags(JSON.parse(mutedRaw))
    } catch {
      // ignore broken local storage
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(bookmarkedIds))
  }, [bookmarkedIds])

  useEffect(() => {
    localStorage.setItem(MUTE_TAGS_KEY, JSON.stringify(mutedTags))
  }, [mutedTags])

  const builtQuery = useMemo(() => {
    const includePart = keyword.trim()
    const excludePart = excludeTags
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith('-') ? tag : `-${tag}`))
      .join(' ')

    const mutedPart = mutedTags.map((tag) => `-${tag}`).join(' ')

    return [includePart, excludePart, mutedPart].filter(Boolean).join(' ').trim()
  }, [keyword, excludeTags, mutedTags])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchPosts() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams()
        if (builtQuery) params.set('tags', builtQuery)
        params.set('sort', sortMode)
        if (ratingFilter !== 'all') params.set('rating', ratingFilter)
        if (minScore.trim()) params.set('min_score', minScore.trim())
        if (minWidth.trim()) params.set('min_width', minWidth.trim())
        if (minHeight.trim()) params.set('min_height', minHeight.trim())
        if (uploader.trim()) params.set('user', uploader.trim())
        if (sourceDomain.trim()) params.set('source_domain', sourceDomain.trim())

        const response = await fetch(`/api/posts?${params.toString()}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('投稿一覧の取得に失敗しました')
        }

        const data: Post[] = await response.json()
        setPosts(data)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        console.error(err)
        setError('投稿を読み込めませんでした')
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = window.setTimeout(fetchPosts, 250)
    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [builtQuery, sortMode, ratingFilter, minScore, minWidth, minHeight, uploader, sourceDomain])

  useEffect(() => {
    const currentToken = keyword.trim().split(/\s+/).pop() ?? ''
    if (!currentToken || currentToken.startsWith('-') || currentToken.includes(':')) {
      setSuggestions([])
      return
    }

    const controller = new AbortController()

    async function fetchSuggestions() {
      try {
        const response = await fetch(`/api/suggest?q=${encodeURIComponent(currentToken)}`, {
          signal: controller.signal,
        })

        if (!response.ok) {
          setSuggestions([])
          return
        }

        const data: string[] = await response.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      }
    }

    const timeoutId = window.setTimeout(fetchSuggestions, 180)
    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [keyword])

  function resetHome() {
    setKeyword('')
    setExcludeTags('')
    setSelectedPost(null)
    setShowSuggestions(false)
    setShowAdvancedSearch(false)
    setRatingFilter('all')
    setMinScore('')
    setMinWidth('')
    setMinHeight('')
    setUploader('')
    setSourceDomain('')
    setSortMode('score_desc')
    setTagMenu(null)
  }

  function toggleBookmark(postId: number) {
    setBookmarkedIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    )
  }

  async function downloadPost(post: Post) {
    try {
      const params = new URLSearchParams({
        url: post.download_url,
        filename: `rule34-${post.id}`,
      })

      const response = await fetch(`/api/download?${params.toString()}`)
      if (!response.ok) throw new Error('download failed')

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `rule34-${post.id}`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(objectUrl)
    } catch (downloadError) {
      console.error(downloadError)
      window.alert('画像の保存に失敗しました')
    }
  }

  function appendIncludeTag(tag: string) {
    setKeyword((prev) => (prev.trim() ? `${prev.trim()} ${tag}` : tag))
    setSelectedPost(null)
    setShowSuggestions(false)
    setTagMenu(null)
  }

  function appendExcludeTag(tag: string) {
    const normalized = tag.startsWith('-') ? tag.slice(1) : tag
    setExcludeTags((prev) => (prev.trim() ? `${prev.trim()} ${normalized}` : normalized))
    setSelectedPost(null)
    setTagMenu(null)
  }

  function runFreshSearch(tag: string) {
    setKeyword(tag)
    setExcludeTags('')
    setSelectedPost(null)
    setShowSuggestions(false)
    setTagMenu(null)
  }

  function muteTag(tag: string) {
    if (!mutedTags.includes(tag)) {
      setMutedTags((prev) => [...prev, tag])
    }
    setSelectedPost(null)
    setTagMenu(null)
  }

  function unmuteTag(tag: string) {
    setMutedTags((prev) => prev.filter((item) => item !== tag))
  }

  function applySuggestion(tag: string) {
    setKeyword((prev) => replaceLastToken(prev, tag))
    setShowSuggestions(false)
  }

  function toggleTagMenu(section: string, tag: string) {
    setTagMenu((prev) => {
      if (prev?.section === section && prev.tag === tag) {
        return null
      }
      return { section, tag }
    })
  }

  function renderMedia(post: Post, className: string) {
    const mediaKind = inferMediaKind(post.download_url || post.image_url)
    if (mediaKind === 'video') {
      return (
        <video
          src={post.download_url}
          className={className}
          controls
          autoPlay
          loop
          muted
          playsInline
        />
      )
    }

    return <img src={post.image_url} alt={post.title} className={className} />
  }

  function renderTagSection(section: string, tags: string[]) {
    if (!tags.length) return null

    return (
      <section className="detail-section" key={section}>
        <h3 className="detail-section-title">{section}</h3>
        <div className="detail-tag-list">
          {tags.map((tag) => {
            const isOpen = tagMenu?.section === section && tagMenu.tag === tag

            return (
              <div key={`${section}-${tag}`} className="tag-action-wrap">
                <button className="tag-chip" onClick={() => toggleTagMenu(section, tag)}>
                  {tag}
                </button>

                {isOpen ? (
                  <div className="tag-action-menu">
                    <button className="tag-action-item" onClick={() => appendIncludeTag(tag)}>追加</button>
                    <button className="tag-action-item" onClick={() => appendExcludeTag(tag)}>除外</button>
                    <button className="tag-action-item" onClick={() => runFreshSearch(tag)}>新規検索</button>
                    <button className="tag-action-item" onClick={() => muteTag(tag)}>ユーザー除外</button>
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>
    )
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner topbar-search-wrap">
          <button className="logo" onClick={resetHome}>rule34+</button>
          <button className="home-button" onClick={resetHome}>ホーム</button>

          <div className="search-stack">
            <div className="search-row">
              <input
                value={keyword}
                onChange={(event) => {
                  setKeyword(event.target.value)
                  setShowSuggestions(true)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="search-input"
                placeholder="タグで検索 例: 2b white_hair"
              />

              <button
                className={`gear-button ${showAdvancedSearch ? 'active' : ''}`}
                onClick={() => setShowAdvancedSearch((prev) => !prev)}
                aria-label="詳細検索"
              >
                ⚙
              </button>
            </div>

            {showSuggestions && suggestions.length ? (
              <div className="suggest-box">
                {suggestions.map((item) => (
                  <button key={item} className="suggest-item" onMouseDown={() => applySuggestion(item)}>
                    {item}
                  </button>
                ))}
              </div>
            ) : null}

            {showAdvancedSearch ? (
              <div className="advanced-panel">
                <div className="advanced-grid">
                  <label className="advanced-field">
                    <span>並び替え</span>
                    <select className="sort-select" value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}>
                      <option value="score_desc">スコア順</option>
                      <option value="id_desc">新しい順</option>
                      <option value="id_asc">古い順</option>
                      <option value="random">ランダム</option>
                    </select>
                  </label>

                  <label className="advanced-field">
                    <span>レーティング</span>
                    <select className="sort-select" value={ratingFilter} onChange={(event) => setRatingFilter(event.target.value as RatingFilter)}>
                      <option value="all">すべて</option>
                      <option value="safe">Safe</option>
                      <option value="questionable">Questionable</option>
                      <option value="explicit">Explicit</option>
                    </select>
                  </label>

                  <label className="advanced-field">
                    <span>最小スコア</span>
                    <input className="search-input" value={minScore} onChange={(event) => setMinScore(event.target.value)} placeholder="例: 100" />
                  </label>

                  <label className="advanced-field">
                    <span>最小幅</span>
                    <input className="search-input" value={minWidth} onChange={(event) => setMinWidth(event.target.value)} placeholder="例: 1000" />
                  </label>

                  <label className="advanced-field">
                    <span>最小高さ</span>
                    <input className="search-input" value={minHeight} onChange={(event) => setMinHeight(event.target.value)} placeholder="例: 1000" />
                  </label>

                  <label className="advanced-field">
                    <span>投稿ユーザー</span>
                    <input className="search-input" value={uploader} onChange={(event) => setUploader(event.target.value)} placeholder="例: bob" />
                  </label>

                  <label className="advanced-field advanced-field-wide">
                    <span>除外タグ</span>
                    <input className="search-input" value={excludeTags} onChange={(event) => setExcludeTags(event.target.value)} placeholder="例: blindfold ai_generated" />
                  </label>

                  <label className="advanced-field advanced-field-wide">
                    <span>ソースドメイン</span>
                    <input className="search-input" value={sourceDomain} onChange={(event) => setSourceDomain(event.target.value)} placeholder="例: pixiv.net" />
                  </label>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="main-grid">
        <aside>
          <section className="sidebar-card">
            <h2 className="section-title">ユーザー除外タグ</h2>
            <div className="tag-list">
              {mutedTags.length ? (
                mutedTags.map((tag) => (
                  <div key={tag} className="detail-tag-item">
                    <span className="tag-chip tag-chip-label">{tag}</span>
                    <button className="tag-chip" onClick={() => unmuteTag(tag)}>解除</button>
                  </div>
                ))
              ) : (
                <p className="side-note">まだありません</p>
              )}
            </div>
          </section>

          <section className="sidebar-card">
            <h2 className="section-title">人気タグ</h2>
            <div className="tag-list">
              {popularTags.map((tag) => (
                <button key={tag} className="tag-chip" onClick={() => appendIncludeTag(tag)}>
                  #{tag}
                </button>
              ))}
            </div>
          </section>
        </aside>

        <section>
          <div className="content-header">
            <div>
              <h1 className="section-title">検索結果</h1>
              <p className="content-subtitle">
                {loading ? '読み込み中...' : `${posts.length} 件の投稿${builtQuery ? ` ・ tags: ${builtQuery}` : ''}`}
              </p>
            </div>
          </div>

          {error ? <div className="notice error">{error}</div> : null}
          {loading ? <div className="notice">投稿を読み込んでいます</div> : null}
          {!loading && !posts.length ? <div className="notice">条件に合う投稿がありません</div> : null}

          <div className="post-grid">
            {posts.map((post) => {
              const isBookmarked = bookmarkedIds.includes(post.id)
              const sizeLabel = post.width && post.height ? `${post.width}×${post.height}` : 'サイズ不明'

              return (
                <article key={post.id} className="post-card clickable" onClick={() => setSelectedPost(post)}>
                  <div className="post-preview">
                    {inferMediaKind(post.download_url || post.image_url) === 'video' ? (
                      <video src={post.download_url} className="post-thumb-media" muted loop autoPlay playsInline />
                    ) : (
                      <img src={post.image_url} alt={post.title} className="post-thumb-media" />
                    )}
                    <div className="post-meta-badge left">{post.rating}</div>
                    <div className="post-meta-badge right">★ {post.score}</div>
                    <div className="post-footer">
                      <span>{sizeLabel}</span>
                      <span>{post.source ?? '不明'}</span>
                    </div>
                  </div>

                  <div className="post-body compact">
                    <div className="post-card-id">post #{post.id}</div>
                    <div className="button-row triple">
                      <button className="action-button" onClick={(event) => { event.stopPropagation(); setSelectedPost(post) }}>開く</button>
                      <button className="action-button" onClick={(event) => { event.stopPropagation(); void downloadPost(post) }}>保存</button>
                      <button className={`action-button ${isBookmarked ? 'active' : ''}`} onClick={(event) => { event.stopPropagation(); toggleBookmark(post.id) }}>ブックマーク</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>

      {selectedPost ? (
        <div className="modal-overlay" onClick={() => setSelectedPost(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 className="section-title">post #{selectedPost.id}</h2>
                <p className="content-subtitle">rule34 の区分で整理して表示しています。</p>
              </div>
              <div className="modal-actions">
                <button className="action-button" onClick={() => resetHome()}>ホーム</button>
                <button className="action-button" onClick={() => setSelectedPost(null)}>閉じる</button>
              </div>
            </div>

            <div className="modal-grid">
              <div className="modal-image-wrap">{renderMedia(selectedPost, 'modal-image')}</div>
              <div className="modal-side">
                <section className="detail-section">
                  <h3 className="detail-section-title">情報</h3>
                  <div className="detail-meta-list">
                    <div>ID: {selectedPost.id}</div>
                    <div>Rating: {selectedPost.rating}</div>
                    <div>Score: {selectedPost.score}</div>
                    <div>Size: {selectedPost.width ?? '?'} × {selectedPost.height ?? '?'}</div>
                    <div>MD5: {selectedPost.md5 ?? '不明'}</div>
                    {selectedPost.source_url ? <a className="source-link" href={selectedPost.source_url} target="_blank" rel="noreferrer">元ソースを開く</a> : null}
                  </div>
                </section>

                {renderTagSection('作者', selectedPost.tags_by_type.artist)}
                {renderTagSection('元ネタ', selectedPost.tags_by_type.copyright)}
                {renderTagSection('キャラ', selectedPost.tags_by_type.character)}
                {renderTagSection('タグ', selectedPost.tags_by_type.general)}
                {renderTagSection('メタ', selectedPost.tags_by_type.meta)}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
