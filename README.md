# rule34+

検索体験を重視した画像サイトの最小スターターです。

このリポジトリには次が入っています。

- Next.js の最小構成
- 投稿一覧 API
- 検索欄つきのトップページ
- 保存ボタンの見た目だけの動作
- Supabase 未設定でも動くデモ投稿

## 注意

この土台は合法な成人向けコンテンツのみを扱う前提です。
年齢不明、未成年、権利侵害の疑いがあるコンテンツを扱わない設計にしてください。

## 起動方法

```bash
npm install
npm run dev
```

そのあと、ブラウザで `http://localhost:3000` を開きます。

### Windows で `npm run build` が `ENOENT` になる場合

`npm error path C:\\Users\\<ユーザー名>\\package.json` のようなエラーは、  
**プロジェクトフォルダではない場所でコマンドを実行している**ときに出ます。

必ず `package.json` があるフォルダ（このリポジトリ直下）へ移動してから実行してください。

> `C:\path\to\Rule34-` は **サンプル** です。  
> そのまま貼り付けると「指定されたパスが見つかりません」になります。

```powershell
# 1) まずフォルダを探す（見つかった場所に移動する）
Get-ChildItem C:\Users\$env:USERNAME -Directory -Recurse -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -eq "Rule34-" } |
  Select-Object -First 3 FullName

# 2) 上で出た実際のパスに cd する（例）
cd "C:\Users\<ユーザー名>\Downloads\Rule34-"

# 3) package.json が見えることを確認
dir package.json

# 4) 依存関係インストールとビルド
npm install
npm run build
```

もし `Rule34-` フォルダ自体が見つからない場合は、先にクローンしてください。

```powershell
cd "C:\Users\<ユーザー名>\Downloads"
git clone <このリポジトリURL> Rule34-
cd .\Rule34-
npm install
npm run build
```

## Supabase をつなぐ時

1. `.env.example` をコピーして `.env.local` を作る
2. Supabase の URL と anon key を入れる
3. `posts` テーブルを作る

### 最小テーブル

```sql
create table posts (
  id bigint generated always as identity primary key,
  title text not null,
  image_url text not null,
  source text,
  work_name text,
  character_name text,
  rating text not null default 'safe',
  score integer not null default 0,
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
```

## 今あるファイル

- `src/app/page.tsx` 画面
- `src/app/api/posts/route.ts` 一覧 API
- `src/lib/supabase/client.ts` Supabase 接続
- `src/app/globals.css` 見た目

## 次にやること

1. 投稿詳細ページを作る
2. ブックマークを本実装する
3. タグ検索を作る
4. ログインをつける
5. 保存を DB に書き込む
