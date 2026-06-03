---
name: nano-banana-builder
description: "Build full-stack web app features on top of Google Gemini's Nano Banana & Nano Banana Pro image models: image generators, conversational editors, avatar makers, style-transfer tools, galleries, and multi-image composition flows. Use when integrating gemini-2.5-flash-image or gemini-3-pro-image-preview into a Next.js/React app via the Vercel AI SDK, with server actions, API routes, storage, rate limiting, and production deployment patterns. For direct Gemini/Imagen image API or CLI usage without an app, use gemini-image instead."
metadata:
  short-description: "Build Gemini image apps (Nano Banana)."
---

# Nano Banana Builder

Google の Nano Banana 画像生成 API を活用した、本番運用可能な Web アプリケーションを構築します。シンプルなテキスト→画像ジェネレーターから、マルチターン会話を用いた高度なイテラティブエディターまで、あらゆる用途に対応します。

API・CLI レイヤーで Gemini/Imagen の画像生成・編集を直接行う場合（アプリ不要）は、`gemini-image` スキルを使用してください。このスキルはモデルの上にアプリ機能を構築することを目的としています。

---

## 重要: 正確なモデル名

**以下の正確なモデル文字列のみを使用してください。推測・造語・日付サフィックスの付加は厳禁です。**

| モデル文字列（そのまま使用） | エイリアス | ユースケース |
|---------------------------|-------|----------|
| `gemini-2.5-flash-image` | Nano Banana | 高速イテレーション・ドラフト・大量生成 |
| `gemini-3.1-flash-image-preview` | — | 最もバランスの取れた flash：最広アスペクト比・最多参照画像・コスト均衡 |
| `gemini-3-pro-image-preview` | Nano Banana Pro | 高品質出力・テキスト描画・2K/4K |

このスキルのサンプルは `gemini-2.5-flash-image`（速度優先）と `gemini-3-pro-image-preview`（品質優先）をデフォルトとしています。バランス型 flash ティアが必要な場合は `gemini-3.1-flash-image-preview` に差し替えてください。モデル全体のマトリクスは `gemini-image` スキルの `references/gemini-image-models.md` を参照してください。

**よくある間違い:**
- ❌ `gemini-2.5-flash-preview-05-20` — 不正。日付サフィックスはテキストモデル用
- ❌ `gemini-2.5-pro-image` — 不正。2.5 Pro は画像生成非対応
- ❌ `gemini-3-flash-image` — 不正。flash 画像モデルは `gemini-3.1-flash-image-preview`
- ❌ `gemini-pro-vision` — 不正。これは画像*入力*用であり生成用ではない

**上記の正確な文字列を使用してください。バリアントの造語や日付サフィックスの付加は禁止です。**

---

## 設計思想: 会話型画像生成

Nano Banana は単なる画像 API ではなく、**会話型として設計されています**。画像生成は一発プロンプトではなく対話として行うのが最も効果的であるという本質的な洞察に基づいています。

**AI アートディレクターと協働するイメージで考えましょう**:
- **イテラティブな改良** → 一発の完璧なプロンプトではなく、会話を通じて画像を積み上げる
- **コンテキスト認識** → モデルは過去の生成・編集を「記憶」している
- **自然言語による編集** → パラメーター指定ではなく、会話的に変更を記述する

### 構築前に確認すること

- **主なユースケースは何か?** テキスト→画像生成? 画像編集? 複数画像のコンポジション? スタイル転送?
- **どのモデルが適切か?** Nano Banana（速度・イテレーション）か Nano Banana Pro（品質・複雑なプロンプト）か?
- **ユーザーの利用フローは?** 単発生成? イテラティブな改良? ギャラリー閲覧?
- **本番環境の制約は?** レート制限? ストレージ? 1 画像あたりのコスト? ユーザー数?

### コア原則

1. **設定より会話**: 複雑なパラメーター UI よりも Nano Banana のイテラティブ編集を活かす
2. **モデル選択が重要**: 速度・イテレーションには `gemini-2.5-flash-image`、品質・複雑さには `gemini-3-pro-image-preview`
3. **状態は会話履歴として管理**: 生成物をチャットメッセージとして追跡し、マルチターン編集を可能にする
4. **レート制限への意識**: 画像生成には厳格なクォータがある——キューイングとキャッシングを実装する
5. **ストレージ戦略**: インライン base64 ではなく生成画像を保存する（Vercel Blob/S3）

### モデル選択フレームワーク

ユースケースに基づいて選択してください:

| ユースケース | モデル | 理由 |
|----------|-------|-----|
| 高速イテレーション・ドラフト | `gemini-2.5-flash-image` | 高速（2〜5 秒）、低コスト |
| バランス重視・多アスペクト比/参照画像 | `gemini-3.1-flash-image-preview` | 最もバランスの取れた flash ティア |
| 最終出力・高品質 | `gemini-3-pro-image-preview` | 優れた品質・thinking・テキスト描画 |
| テキスト多用画像 | `gemini-3-pro-image-preview` | 最高の文字組版・2K/4K 解像度 |
| マルチターン編集 | いずれも可 | 全モデルが会話型編集に対応 |
| 大量処理 | `gemini-2.5-flash-image` | 低コスト・高スループット |

---

## クイックスタート

### 基本的な Server Action

```typescript
// app/actions/generate.ts
'use server'

import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export async function generateImage(prompt: string) {
  const result = await generateText({
    model: google('gemini-2.5-flash-image'),
    prompt,
    providerOptions: {
      google: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '16:9' }
      }
    }
  })

  return result.files[0] // { base64, uint8Array, mediaType }
}
```

### useChat を使用した Client Component

```typescript
// app/components/ImageGenerator.tsx
'use client'

import { useChat } from '@ai-sdk/react'

export function ImageGenerator() {
  const { append, messages, isLoading } = useChat({
    api: '/api/generate'
  })

  return (
    <div>
      {messages.map(m => (
        <div key={m.id}>
          {m.parts?.map((part, i) =>
            part.type === 'image' && (
              <img key={i} src={part.url} alt="Generated" />
            )
          )}
        </div>
      ))}

      <button
        disabled={isLoading}
        onClick={() => append({
          role: 'user',
          content: 'A futuristic cityscape at dusk'
        })}
      >
        Generate
      </button>
    </div>
  )
}
```

---

## 高度な実装

以下を含む完全な実装例:
- **Server Actions**: モデル選択・ストレージ・エラーハンドリング付き
- **API Routes**: ストリーミングレスポンス
- **Client Components**: イテラティブ編集とギャラリー
- **高度なパターン**: 複数画像のコンポジションやバッチ生成

**references/advanced-patterns.md** を参照してください。

---

## 設定と運用

詳細な設定・運用に関する事項:
- **Provider Options** (responseModalities, imageConfig, thinkingConfig)
- **ストレージ戦略** (Vercel Blob、S3/R2 実装)
- **レート制限** (Upstash Redis パターン、クォータ管理)
- **コスト最適化**戦略

**references/configuration.md** を参照してください。

---

## 避けるべきアンチパターン

❌ **モデル名の造語や日付サフィックスの付加**:
問題点: 画像生成モデルには固有の名前がある。`-preview-05-20` のような日付サフィックスはテキストモデル専用
改善: `gemini-2.5-flash-image`、`gemini-3.1-flash-image-preview`、または `gemini-3-pro-image-preview` を正確に使用する。他のバリアントは不可

❌ **画像生成に Gemini 2.5 Pro を使用**:
問題点: Gemini 2.5 Pro は画像を直接生成しない
改善: 上記の画像モデルのいずれかを使用する

❌ **base64 のみをデータベースに保存**:
問題点: DB の肥大化・高コストストレージ・遅い取得
改善: オブジェクトストレージ（Vercel Blob/S3）に保存し、URL のみを保持する

❌ **レート制限ハンドリングなし**:
問題点: 本番環境で 429 エラーが発生し、UX が悪化する
改善: ユーザーフレンドリーなエラーメッセージ付きのレート制限を実装する

❌ **マルチターンコンテキストの無視**:
問題点: Nano Banana の会話型編集という強みを活かせない
改善: イテラティブな改良のためにチャット履歴を追跡する

❌ **クライアント側への API キーのハードコード**:
問題点: クレデンシャルの露出・セキュリティリスク
改善: 環境変数を使用した server actions / API routes を利用する

❌ **誤ったアスペクト比の使用**:
問題点: 1:1 リクエストに 21:9 を指定するとトークン浪費・予期しないトリミングが発生
改善: 意図するユースケースに合ったアスペクト比を選択する

❌ **ローディング状態なし**:
問題点: 画像生成には 5〜30 秒かかり、ユーザーが壊れていると思う
改善: 進捗インジケーターと推定待機時間を表示する

❌ **キーストローク毎に生成**:
問題点: クォータの無駄遣い・遅いレスポンス
改善: プロンプトをデバウンスし、明示的なアクションを要求する

---

## バリエーションガイダンス

**重要**: すべてのアプリはその目的に合わせて独自にデザインされた感覚を持つべきです。

**以下の観点でバリエーションを持たせてください**:
- **UI スタイル**: ミニマル・ブルータリスト・遊び心・プロフェッショナル・ダーク・ライト
- **カラースキーム**: ウォーム・クール・モノクローム・鮮やか・落ち着いた
- **レイアウト**: 単一ページ・マルチステップウィザード・サイドバー・グリッド・リスト
- **インタラクション**: クリックで生成・ドラッグ&ドロップ・リアルタイム入力・バッチ処理

**使い古されたパターンを避けてください**:
- ❌ デフォルトの Tailwind 紫グラデーション
- ❌ 汎用的な「AI スタートアップ」的な見た目
- ❌ すべてのプロジェクトで同じコンポーネントライブラリ
- ❌ 意図なく Inter/Roboto フォントを使用

**コンテキストがデザインを導くべきです**:
- **ミームジェネレーター** → 太く・楽しく・カジュアルに
- **プロダクトモックアップツール** → クリーン・プロフェッショナル・グリッドベース
- **アート探索ツール** → ギャラリー優先・ビジュアル重視
- **ブランドアセット作成ツール** → 洗練された・テンプレート誘導型

---

## 環境セットアップ

```bash
# .env.local
GEMINI_API_KEY=your_api_key_here

# Vercel Blob ストレージ用
BLOB_READ_WRITE_TOKEN=your_vercel_token

# S3 用（任意）
S3_BUCKET=your-bucket
S3_ENDPOINT=https://your-endpoint.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=your_key
S3_SECRET_ACCESS_KEY=your_secret

# Upstash レート制限用（任意）
UPSTASH_REDIS_REST_URL=your_url
UPSTASH_REDIS_REST_TOKEN=your_token
```

```bash
# 依存関係のインストール
npm install @ai-sdk/google ai @ai-sdk/react @vercel/blob

# AI SDK の代わりに Google 公式 JS SDK で Gemini を直接呼び出す場合
npm install @google/genai
```

---

## まとめ

**Nano Banana は、ツールではなくクリエイティブなパートナーと協働するような会話型画像生成を実現します。**

優れたアプリの条件:
- マルチターン編集を改良に活かす
- モデルを意図的に選択する（速度 vs 品質）
- レート制限をグレースフルに処理する
- 画像を効率的に保存する
- 優れたローディング状態を提供する
- 目的に合わせた独自のデザインを持つ

あなたが構築するのは単なる画像ジェネレーターではなく、クリエイティブな体験です。思慮深くデザインしてください。
