---
name: gpt-image-1-5
description: "OpenAI gpt-image-1.5 で汎用的な画像生成・編集を行う。プロンプト設計、背景透過アセット、スタイル制御イラスト、コンセプトアート、アイコン、スプライト/アニメーションの一貫性を、Images API および Responses API の image_generation ツールで扱う。ユーザーが明示的に gpt-image-1.5 を指定したとき、または gpt-image-2 が使えないときに使う。最新・最高品質のOpenAI画像モデルが欲しいだけなら gpt-image-2-0 を優先する。Open Graph / SNS共有画像には専用の og-image-ai を使う。"
metadata:
  short-description: "OpenAI GPT Image 1.5 generation + prompting + API wrapper."
---

# GPT Image 1.5

ユーザーが OpenAI `gpt-image-1.5` で実際に画像を生成したい場合、またはそのモデルに対して適切な prompting とパラメータ選択が必要なタスクの場合にこのスキルを使用する。

## 理念: 意図をプロダクション用リクエストに変換する

画像生成とは「きれいな prompt を書いて祈る」ことではない。曖昧なアートリクエストを、適切なsubject・構図・スタイル・制約・出力設定を持つ具体的なプロダクション用リクエストに変換することが仕事だ。

**生成前に確認すること:**
- 成果物の種類は何か: コンセプトアート、アイコン、製品レンダリング、マーケティング画像、キャラクターシート、UI要素、透明背景アセット?
- 固定すべき要素は何か: フレーミング、パレット、時代、カメラアングル、背景処理、テキスト、ブランド詳細?
- ファイルは何のために最適化するか: レビュー用、反復速度、印刷品質、Web用、透明切り抜き?
- ユーザーが求めているのは単一画像か、それとも関連画像のシステムか?

**基本原則**:
1. **形容詞の羅列より意図を優先**: スタイルワードの長いリストより、具体的な構図と制約の方が効果的。
2. **出力設定は promptの一部**: size・quality・format・backgroundは実用性に実質的な影響を与える。
3. **見せかけより誠実さ**: API実行または出力受信後にのみ画像生成完了を主張する。

## GPT Image 1.5 の使い方

OpenAIは `gpt-image-1.5` をテキストと画像を入力とし、画像とテキストを出力するGPT Imageモデルとして文書化している。Images APIは `gpt-image-1.5` による生成をサポートし、`png`・`webp`・`jpeg` 出力と、文書化されたsize/quality/backgroundコントロールを提供する。詳細は `references/openai-gpt-image-1-5.md` を参照。

これは `gpt-image-1.5` の汎用画像スキルだ。ユーザーが単に最新・最良のOpenAI画像モデルを求めている場合は、`gpt-image-2-0` スキル（より新しく高品質）を優先する。Open Graph / ソーシャル共有画像に特化したケースでは、専用の `og-image-ai` パイプラインを使用すること。

### このスキルを使う場面

- ユーザーがOpenAIで画像生成を依頼した場合。
- ユーザーが `gpt-image-1.5` 向けの prompt を必要としている場合。
- 透明背景アセット、アイコン、コンセプトアート、製品写真、スタイライズドイラストが必要な場合。
- Images API の実行可能なAPIサンプルやラッパースクリプトが必要な場合。

### 生成ワークフロー

1. ユーザーリクエストから目標成果物と出力制約を明確にする。
2. 必要に応じて以下の要素を含む prompt を作成する:
   - subject（被写体）
   - 構図
   - スタイル/素材/時代
   - 照明/カメラ
   - 重要な除外事項
   - ファイルの用途
3. API設定を意図的に選択する:
   - `size`: `1024x1024`、`1024x1536`、`1536x1024`、または `auto`
   - `quality`: `low`、`medium`、`high`、または `auto`
   - `output_format`: `png`、`webp`、または `jpeg`
   - `background`: `transparent` は `png` または `webp` の場合のみ使用
4. 画像生成が要求され `OPENAI_API_KEY` が利用可能な場合は `scripts/gpt_image_generate.py` を使用する。
5. 出力をユーザーが見えるパスに保存し、生成した内容を正確に報告する。

### Prompt の構成

コンパクトでプロダクション志向の prompt を優先する:

```text
Create a side-view fantasy inn sign for a 2D platformer. Carved wood, brass brackets, hand-painted fox emblem, warm lantern glow, readable silhouette, transparent background, no mockup, no text, centered composition.
```

スタイルに敏感な作業では、矛盾する5つの方向性ではなく、明確な1つのビジュアル方向性を追加する:

- 良い例: `1990s SNES-era platformer prop with restrained palette and crisp pixel clusters`
- 悪い例: `hyper realistic painterly low poly anime cinematic pixel art watercolor`

反復する際は、一度に1軸だけ変更する:

- シルエット
- パレット
- カメラ/フレーミング
- サーフェスの細部
- ムード/照明

### OpenAI Cookbookのプロンプティングポイント

GPT Image 1.5向けのOpenAI cookbookガイダンスは、上記の prompt 戦略を強化する:

- **用途**を明確に設定することから始める: コンセプトアート、スクリーンショット、アイコン、編集、テキスト重視グラフィック、製品レンダリング、透明アセット。
- prompt 構造を順序立てて明示的に保つ:
  - subject（被写体）
  - 環境/背景
  - 構図/カメラ/フレーミング
  - スタイル/素材/時代
  - 照明/カラー処理
  - 厳密な制約と除外事項
- **配置と関係性**について具体的に記述する: オブジェクトの位置、前景と背景の区別、重なり、必ず見えなければならないもの。
- 編集の際は以下の両方を述べる:
  - 変更すべき点
  - 変更してはならない点
- 画像内のテキストはリテラルコンテンツとして扱う:
  - 正確なテキストを引用する
  - 短く保つ
  - 配置とタイポグラフィの期待を明示する
- 複数の参照画像には prompt 内で概念的なラベルを付ける。例: `image 1 = character silhouette`、`image 2 = color palette`、`image 3 = environment mood`。
- 毎回 prompt 全体を書き直すのではなく、**小さく制御されたデルタ**で反復する。
- レイアウトの忠実度が重要な場合は、ムードボードではなくデザイン仕様のように画像を記述する。

### スプライトアニメーションの一貫性

低解像度スプライトアニメーション編集では、「同じキャラクター」という表現だけでは不十分だ。小さなピクセルキャラクターは以下の点でブレやすい:

- frame-1のサイズ
- 体の向き
- アウトラインの太さ
- 顔の視認性
- コスチュームのシルエット

スプライトストリップ作業には、より厳密なパターンを使用する:

1. 古いコンセプトエクスポートではなく、**現在ゲームに実装されているフレーム**から始める。
2. その実装済みフレームをアップスケールして意図したスロットレイアウトに配置した透明な**参照キャンバス**を構築する。
3. フレームごとの編集より1回のフルストリップ編集を優先する。
4. 反復する場合は、フル再解釈より現在の最良ストリップへの**小幅なリタッチ**を優先する。
5. 複数画像編集では、各画像に役割を明示的にラベル付けする:
   - `Image 1 = identity anchor`
   - `Image 2 = pose/layout/motion anchor`
6. 以下の両方を述べる:
   - **変更すべき点**
   - **変更してはならない点**
7. 以下の保持リストを積極的に繰り返す:
   - side view（横向き）
   - head size（頭部サイズ）
   - silhouette family（シルエット系統）
   - palette family（パレット系統）
   - outline thickness（アウトラインの太さ）
   - apparent scale（見た目のスケール）

アイドルから始まるべき状態には2つの異なる手法がある:

- **Hard-lock on import**: ゲームプレイが正確に実装済みアイドルフレームから始まる必要がある場合に有効だが、生成されたframe 2がロックされたframe 1と一致しない場合に視覚的なジャンプが生じる可能性がある。
- **Protected frame-1 edit**: 視覚的な連続性が必要な場合に強力。frame 1を編集自体で不変に保つ（理想的にはマスキングで）、GPTに後のフレームのみ変更させる。

実践的なルール:

- 問題が「アニメーションが実際のアイドルスプライトから始まらない」なら、hard-lockが有効。
- 問題が「frame 1とframe 2が別のキャラクターに見える」なら、hard-lock単独では不十分。より外科的な編集かマスクを使用する。

構造の例:

```text
Create a portrait 16-bit pixel-art gameplay screenshot.
Subject: a pirate hero climbing a rope.
Environment: sea cave opening with dock platforms and shallow surf below.
Composition: side-view, centered hero, upward route clearly readable, HUD at top only.
Style: authentic 16-bit pixel art, 256x384 internal resolution, 4x nearest-neighbor upscale.
Lighting/color: bright coastal blues with warm stone and wood tones.
Constraints: visible pixels, limited palette, stepped shading, no glossy rendering, no collage, no poster framing.
```

## バンドルスクリプトの使い方

1枚以上の画像を生成する:

```bash
OPENAI_API_KEY=... \
python3 scripts/gpt_image_generate.py \
  --prompt "Isometric potion shop icon, transparent background, polished game asset" \
  --out-dir tmp/potion_shop --quality high --size 1024x1024 --output-format png
```

便利なフラグ:

- `--background transparent`
- `--n 1`
- `--filename-prefix hero`
- `--user some-trace-id`

スクリプトは `POST /v1/images/generations` を呼び出し、`b64_json` をデコードして画像ファイルをディスクに書き込む。

## 避けるべきアンチパターン

❌ **アンチパターン: 生成前に成功を主張する**
なぜ悪いか: ユーザーは仮定的な prompt ではなく画像を求めている。
改善策: credentialが利用可能ならスクリプトを実行し、APIアクセスがない場合は明確にそう伝える。

❌ **アンチパターン: 矛盾する prompt の積み重ね**
なぜ悪いか: モデルへのガイダンスが強くなるのではなく、弱くなる。
改善策: 1つのsubject、1つの構図、1つの主要スタイル方向性を選ぶ。

❌ **アンチパターン: `jpeg` で透明背景を指定する**
なぜ悪いか: OpenAIは透明度を `png` と `webp` に対して文書化しており、`jpeg` には対応していない。
改善策: 透明度が重要な場合は `png` または `webp` を使用する。

❌ **アンチパターン: スプライトシートの生成を保証されたものとして扱う**
なぜ悪いか: 画像モデルは決定論的なシートレイアウトより単一アセットやイラスト生成の方が得意だ。
改善策: ユーザーが明示的に実験を望む場合を除き、1回の呼び出しにつき1アセット、1ポーズ、または1状態を求める。

❌ **アンチパターン: すべてのリクエストをデフォルトで最高品質にする**
なぜ悪いか: 反復が遅くなり、初期アイデア出しでコストを無駄にする可能性がある。
改善策: 探索中は `low` または `medium` を使用し、最終出力時に品質を上げる。

❌ **アンチパターン: 小さなスプライトに「同じキャラクター」だけで十分と扱う**
なぜ悪いか: モデルはスケール、向き、シルエットを変えながらもキャラクターのアイデアを保持する可能性がある。
改善策: side view（横向き）、head size（頭部サイズ）、outline thickness（アウトラインの太さ）、palette family（パレット系統）、apparent scale（見た目のスケール）などの厳密な不変条件を再述する。

❌ **アンチパターン: 本当の問題がシーケンスのミスマッチなのに後からframe 1を差し替える**
なぜ悪いか: ロックされた最初のフレームは、frame 2が見た目の異なるキャラクターとして生成された場合にアニメーションをよりぎこちなくさせる可能性がある。
改善策: 生成されたストリップが既によく一致している場合のみhard-lockを使用するか、マスク/保護されたframe-1編集に移行する。

❌ **アンチパターン: デフォルトでシードスプライトの繰り返しコピーをより強力なidentity anchorとして使用する**
なぜ悪いか: 小さなスプライト作業では、すべてのスロットに同じシードを繰り返しても、意図したキャラクターを保持する代わりに不良な再解釈にブレてしまう可能性がある。
改善策: 単一シードスロットか現在の最良ストリップへの外科的リタッチのどちらがより良い連続性を生み出すかテストする。

## バリエーションガイダンス

**重要**: すべてのリクエストに対して1つのハウススタイルに収束しないこと。

- アセットタイプ別に prompt 構造を変える: プロップの prompt、キャラクターの prompt、アイコン、シーンアートはそれぞれ異なる強調点が必要。
- ブリーフに基づいてレンダリング方向を変える: 絵画的なイラスト、フラットアイコノグラフィー、3Dレンダーの外観、ピクセルインスパイアドコンセプト、UIに使えるカットアウト。
- ランダムなバリエーションよりコンテキストに合ったものを優先する。スタイルの再利用はユーザーが一貫したセットを構築している場合のみ。

## 参照

- API/モデル情報: `references/openai-gpt-image-1-5.md`
- 実行可能なジェネレーター: `scripts/gpt_image_generate.py`
- OpenAI cookbookプロンプティングガイド: https://developers.openai.com/cookbook/examples/multimodal/image-gen-1.5-prompting_guide/

## 覚えておくこと

このスキルは画像生成を理論的ではなく実用的にすることを目的としている。

リクエストを精密な prompt に変換し、設定を意図的に選択し、可能な場合はAPIを実行し、実際の出力パスをユーザーに報告する。
