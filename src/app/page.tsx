'use client'

import { useEffect, useMemo, useState } from 'react'

type Post = {
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

const popularTags = ['1girl', 'solo', 'white_hair', 'blue_hair', 'night', 'jacket']

export default function Page() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [keyword, setKeyword] = useState('')
  const [savedIds, setSavedIds] = useState<number[]>([])

  useEffect(() => {
    async function fetchPosts() {
      try {
        setLoading(true)
        setError('')

        const response = await fetch('/api/posts')
        if (!response.ok) {
          throw new Error('投稿一覧の取得に失敗しました')
        }

        const data: Post[] = await response.json()
        setPosts(data)
      } catch (err) {
        console.error(err)
        setError('投稿を読み込めませんでした')
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
  }, [])

  const filteredPosts = useMemo(() => {
    const normalized = keyword.trim().toLowerCase()
    if (!normalized) {
      return posts
    }

    return posts.filter((post) => {
      const title = post.title?.toLowerCase() ?? ''
      const source = post.source?.toLowerCase() ?? ''
      const workName = post.work_name?.toLowerCase() ?? ''
      const characterName = post.character_name?.toLowerCase() ?? ''

      return (
        title.includes(normalized) ||
        source.includes(normalized) ||
        workName.includes(normalized) ||
        characterName.includes(normalized)
      )
    })
  }, [posts, keyword])

  function toggleSave(postId: number) {
    setSavedIds((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    )
  }

  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="logo">rule34+</div>
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            className="search-input"
            placeholder="タイトル、作品、キャラ、出典で検索"
          />
        </div>
      </header>

      <main className="main-grid">
        <aside>
          <section className="sidebar-card">
            <h2 className="section-title">人気タグ</h2>
            <div className="tag-list">
              {popularTags.map((tag) => (
                <button key={tag} className="tag-chip">
                  #{tag}
                </button>
              ))}
            </div>
            <p className="side-note">今は見本です。あとで本物のタグ検索につなぎます。</p>
          </section>
        </aside>

        <section>
          <div className="content-header">
            <div>
              <h1 className="section-title">検索結果</h1>
              <p className="content-subtitle">
                {loading ? '読み込み中...' : `${filteredPosts.length} 件の投稿`}
              </p>
            </div>
          </div>

          {error ? <div className="notice error">{error}</div> : null}
          {loading ? <div className="notice">投稿を読み込んでいます</div> : null}
          {!loading && !filteredPosts.length ? (
            <div className="notice">条件に合う投稿がありません</div>
          ) : null}

          <div className="post-grid">
            {filteredPosts.map((post) => {
              const isSaved = savedIds.includes(post.id)
              const sizeLabel =
                post.width && post.height ? `${post.width}×${post.height}` : 'サイズ不明'

              return (
                <article key={post.id} className="post-card">
                  <div className="post-preview">
                    <img src={post.image_url} alt={post.title} />
                    <div className="post-meta-badge left">{post.rating}</div>
                    <div className="post-meta-badge right">★ {post.score}</div>
                    <div className="post-footer">
                      <span>{sizeLabel}</span>
                      <span>{post.source ?? '不明'}</span>
                    </div>
                  </div>

                  <div className="post-body">
                    <h2 className="post-title">{post.title}</h2>
                    <p className="post-subtitle">
                      {post.work_name ?? '作品不明'} ・ {post.character_name ?? 'キャラ不明'}
                    </p>
                    <div className="button-row">
                      <button
                        onClick={() => toggleSave(post.id)}
                        className={`action-button ${isSaved ? 'active' : ''}`}
                      >
                        {isSaved ? '保存済み' : '保存'}
                      </button>
                      <button className="action-button">ブックマーク</button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      </main>
    </div>
  )
}
