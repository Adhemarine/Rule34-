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

const popularTags = ['1girl', 'solo', 'white_hair', 'blue_hair', 'night', 'jacket']
const cheatSheet = [
  '2b blindfold',
  '( 2b ~ a2 )',
  '-blindfold',
  'rating:explicit score:>=10',
  'sort:score:desc',
]

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [excludeTags, setExcludeTags] = useState('')
  const [bookmarkedIds, setBookmarkedIds] = useState<number[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)

  const builtQuery = useMemo(() => {
    const includePart = keyword.trim()
    const excludePart = excludeTags
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map((tag) => (tag.startsWith('-') ? tag : `-${tag}`))
      .join(' ')

    return [includePart, excludePart].filter(Boolean).join(' ').trim()
  }, [keyword, excludeTags])

  useEffect(() => {
    const controller = new AbortController()

    async function fetchPosts() {
      try {
        setLoading(true)
        setError('')

        const params = new URLSearchParams()
        if (builtQuery) {
          params.set('tags', builtQuery)
        }

        const url = params.toString() ? `/api/posts?${params.toString()}` : '/api/posts'
        const response = await fetch(url, { signal: controller.signal })

        if (!response.ok) {
          throw new Error('投稿一覧の取得に失敗しました')
        }

        const data: Post[] = await response.json()
        setPosts(data)
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          return
        }

        console.error(err)
        setError('投稿を読み込めませんでした')
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = window.setTimeout(fetchPosts, 300)

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [builtQuery])

  function resetHome() {
    setKeyword('')
    setExcludeTags('')
    setSelectedPost(null)
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
        filename: `rule34-${post.id}.jpg`,
      })

      const response = await fetch(`/api/download?${params.toString()}`)
      if (!response.ok) {
        throw new Error('download failed')
      }

      const blob = await response.blob()
      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = `rule34-${post.id}.jpg`
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
  }

  function appendExcludeTag(tag: string) {
    const normalized = tag.startsWith('-') ? tag.slice(1) : tag
    setExcludeTags((prev) => (prev.trim() ? `${prev.trim()} ${normalized}` : normalized))
    setSelectedPost(null)
  }

  function renderTagSection(title: string, tags: string[]) {
    if (!tags.length) {
      return null
    }

    return (
      <section className="detail-section" key={title}>
        <h3 className="detail-section-title">{title}</h3>
        <div className="detail-tag-list">
          {tags.map((tag) => (
            <div key={`${title}-${tag}`} className="detail-tag-item">
              <button className="tag-chip" onClick={() => appendIncludeTag(tag)}>
                {tag}
              </button>
              <button className="tag-chip tag-chip-negative" onClick={() => appendExcludeTag(tag)}>
                −
              </button>
            </div>
          ))}
        </div>
      </section>
    )
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="logo" onClick={resetHome}>rule34+</button>
          <button className="home-button" onClick={resetHome}>ホーム</button>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="search-input"
            placeholder="Rule34 検索構文 例: 2b rating:explicit sort:score:desc"
          />
        </div>
      </header>

      <main className="main-grid">
        <aside>
          <section className="sidebar-card">
            <h2 className="section-title">除外タグ</h2>
            <input
              value={excludeTags}
              onChange={(event) => setExcludeTags(event.target.value)}
              className="search-input sidebar-input"
              placeholder="例: blindfold ai_generated"
            />
            <p className="side-note">ここに入れたタグは自動で -tag に変換します。</p>
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

          <section className="sidebar-card">
            <h2 className="section-title">検索構文</h2>
            <div className="cheatsheet-list">
              {cheatSheet.map((example) => (
                <button key={example} className="cheatsheet-item" onClick={() => setKeyword(example)}>
                  {example}
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
                    <img src={post.image_url} alt={post.title} />
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
                      <button
                        className="action-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setSelectedPost(post)
                        }}
                      >
                        開く
                      </button>
                      <button
                        className="action-button"
                        onClick={(event) => {
                          event.stopPropagation()
                          void downloadPost(post)
                        }}
                      >
                        保存
                      </button>
                      <button
                        className={`action-button ${isBookmarked ? 'active' : ''}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          toggleBookmark(post.id)
                        }}
                      >
                        ブックマーク
                      </button>
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
              <div className="modal-image-wrap">
                <img src={selectedPost.image_url} alt={selectedPost.title} className="modal-image" />
              </div>

              <div className="modal-side">
                <section className="detail-section">
                  <h3 className="detail-section-title">情報</h3>
                  <div className="detail-meta-list">
                    <div>ID: {selectedPost.id}</div>
                    <div>Rating: {selectedPost.rating}</div>
                    <div>Score: {selectedPost.score}</div>
                    <div>
                      Size: {selectedPost.width ?? '?'} × {selectedPost.height ?? '?'}
                    </div>
                    <div>MD5: {selectedPost.md5 ?? '不明'}</div>
                    {selectedPost.source_url ? (
                      <a className="source-link" href={selectedPost.source_url} target="_blank" rel="noreferrer">
                        元ソースを開く
                      </a>
                    ) : null}
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
