---
name: gpt-image-2-0
description: "OpenAI gpt-image-2（より新しく高品質なGPT Imageモデル）で汎用的な画像生成・編集を行う。任意サイズ出力、プロンプト設計、複数参照画像での編集、製品レンダリング、コンセプトアート、アイコンを、Images API および Responses API の image_generation ツールで扱う。最新・最高品質のOpenAI画像モデルが欲しいとき、大きなカスタム寸法や複数画像編集が必要なときに優先して使う。ユーザーが明示的に gpt-image-1.5 を指定したときや背景透過が必要なとき（gpt-image-2 は透過非対応）は gpt-image-1-5 を使う。Open Graph / SNS共有画像には専用の og-image-ai を使う。"
metadata:
  short-description: "OpenAI GPT Image 2 generation, edits, prompting, and API wrappers."
---

# GPT Image 2.0

このスキルは、ユーザーが OpenAI `gpt-image-2` による実際の画像生成や画像編集を求めているとき、またはタスクに強力なプロンプト設計と意図的な出力制御が必要なときに使用する。

## 哲学: 画像作業は「雰囲気」ではなく「仕様書」として扱う

`gpt-image-2` はリクエストをプロダクションブリーフとして扱うときに最大の力を発揮する。目的を、モデルが確実に実行できる仕様（被写体・フレーミング・素材・制約・出力サイズ・編集境界）に変換することが仕事だ。

**生成前に確認すること:**
- 成果物は何か: コンセプトアート、アイコン、プロダクトレンダー、シーンプレート、マーケティング画像、またはリファレンス主導の編集か?
- 何を安定させなければならないか: アイデンティティ、カメラアングル、シルエット、テキスト、パレット、プロポーション、ブランドキューか?
- 出力は何に最適化されるか: 高速イテレーション、最終レビュー、Web配信、特定のピクセルサイズか?
- ユーザーは1枚の画像を求めているか、それとも関連画像の再利用可能なシステムを求めているか?

**基本原則**:
1. **形容詞の羅列より仕様の明確化**: 被写体・構図・出力制約を明確にする方が、ムード語の乱用より効果的。
2. **パラメータはクリエイティブブリーフの一部**: `size`、`quality`、`output_format`、`output_compression`、`background` は結果に本質的な影響を与える。
3. **編集には保持言語が必要**: 画像編集では、何が変わり何が変わらないかを明示する。
4. **劇場より真実**: API が実際に呼ばれてファイルが書き込まれた後にのみ、画像の存在を主張する。

## GPT Image 2 との連携

`gpt-image-2` はより新しく高品質な GPT Image モデルであり、ユーザーが OpenAI の最良・最新の画像モデルを求めるときのデフォルト選択肢だ。`gpt-image-1-5` を使うのは、ユーザーが明示的に `gpt-image-1.5` を要求するか、`gpt-image-2` がサポートしない透過背景が必要な場合に限る。Open Graph / ソーシャルシェア画像には、専用の `og-image-ai` パイプラインを使うこと。

OpenAI は `gpt-image-2` を生成・編集における現在の最高水準の GPT Image モデルとして文書化している。2026年4月21日時点で、モデルページにはエイリアス `gpt-image-2` とスナップショット `gpt-image-2-2026-04-21` が記載されている。また、旧来の GPT Image ワークフローとの相違点もいくつか文書化されている:

- 任意の画像サイズをサポート（モデルの制約に従う）
- 画像入力は常に高精度で処理される
- JPEG と WebP は明示的な圧縮制御をサポート
- `gpt-image-2` では透過背景はサポートされない

以下のリファレンスを意図的に読むこと:

- モデルおよび API の制約については `references/openai-gpt-image-2.md`
- prompt 構造、テキスト重視のワークフロー、マルチ画像プロンプト、イテレーションパターンについては `references/openai-prompting-guide.md`

### このスキルを使う場面

- ユーザーが OpenAI の画像生成または編集を求めているとき。
- ユーザーが `gpt-image-2` 向けの prompt を欲しいとき。
- ユーザーが生成または編集用の実行可能な Images API スクリプトを必要としているとき。
- `2048x2048` や `3840x2160` などの大きなカスタム寸法がタスクに適しているとき。
- アイデンティティと構図を別々のソース画像で分けて処理するマルチ画像リファレンス編集が必要なとき。

### API の選択

- Images API は、1つの prompt を入力して1つの画像結果を得る場合に使う。
- Responses API は、会話形式、ツール駆動、またはより長いマルチモーダルなやり取りの一部である場合に使う。
- このスキルにバンドルされているスクリプトは、ユーザーが `POST /v1/images/generations` または `POST /v1/images/edits` の直接的なローカルラッパーを求めているときに使う。

## 生成ワークフロー

1. 成果物、不変要素、出力目標を特定する。
2. 最も管理しやすい prompt 形式を選ぶ。プロダクション作業では、長い段落より短いラベル付き仕様の方が通常は優れている。
3. prompt のスキャフォールディングには、関連する場合に次の順序を優先する:
   - 意図した用途またはアセットタイプ
   - シーンまたは背景
   - 被写体
   - 構図またはカメラフレーミング
   - スタイル/素材/時代
   - ライティング/カラー処理
   - テキスト要件
   - 厳密な制約と除外事項
4. リクエストがテキスト重視、レイアウト重視、またはリファレンス主導の場合は、最終 prompt を作成する前に `references/openai-prompting-guide.md` を読むこと。
5. 詳細な prompt は拡張するのではなく正規化する。ユーザーのリクエストが不十分で追加の詳細が結果を実質的に改善する場合にのみ、適度な補完を加える。
6. 出力制御を意図的に選択する:
   - `size`: `auto` またはドキュメント化された `gpt-image-2` の制限を満たす任意の `WIDTHxHEIGHT`
   - `quality`: `low`、`medium`、`high`、または `auto`
   - `output_format`: `png`、`webp`、または `jpeg`
   - `output_compression`: `jpeg` または `webp` の場合は `0-100`
   - `background`: `opaque` または `auto`
7. 画像生成が要求されており `OPENAI_API_KEY` が利用可能な場合は、`scripts/gpt_image_generate.py` を使う。
8. 出力をユーザーが見えるパスに保存し、生成内容を正確に報告する。

### Prompt スキャフォールド

タスクに構造が役立つ場合は、次のようなコンパクトな仕様を使う:

```text
Intended use:
Primary request:
Input images:
Scene/backdrop:
Subject:
Style/medium:
Composition/framing:
Lighting/mood:
Text (verbatim):
Constraints:
Avoid:
```

タスクタイプ別の詳細な promptパターンについては、`references/openai-prompting-guide.md` を参照すること。

### Prompt の構築

プロダクション志向の prompt を優先する:

```text
Create a polished isometric apothecary counter prop for a fantasy management game. Brass scale, labeled glass jars, dark walnut wood, neatly arranged herbs, centered composition, soft studio lighting, readable silhouette, no text, no frame, no watermark.
```

レイアウト重視の作業では、prompt をデザイン仕様のように構造化する:

- 意図した用途
- シーン/背景の処理
- 被写体と焦点オブジェクト
- カメラ/フレーミング
- レンダリング方向
- 文字通りの制約
- 除外事項

イテレーションでは、一度に1つの軸だけ変更する:

- シルエット
- フレーミング
- 素材の処理
- ライティング
- パレット
- ディテールの密度

## 編集ワークフロー

`gpt-image-2` は常に高精度で画像入力を処理する。これにより編集が強力になるが、リファレンス画像の編集は古い低精度の編集フローよりコストがかかる場合がある。

編集およびリファレンス画像ワークフローについて:

1. タスクに必要な最小限の画像セットを送る。
2. prompt で画像の役割を明示的にラベル付けする。例えば:
   - `image 1 = identity anchor`
   - `image 2 = pose/layout reference`
   - `image 3 = texture/material reference`
3. 次の両方を明示する:
   - 何を変えるか
   - 何を変えないか
4. ユーザーが制御されたレタッチを必要とする場合は、完全な再解釈より小さな変化量を優先する。
5. 編集にテキスト置換、ローカライズ、またはレイアウト保持が含まれる場合は、`references/openai-prompting-guide.md` を読み、prompt を保持仕様として扱うこと。
6. ローカルの編集リクエストには `scripts/gpt_image_edit.py` を使う。

編集 prompt の例:

```text
Use image 1 as the identity anchor and image 2 as the composition guide. Keep the same bottle shape, label placement, and cork silhouette from image 1. Change only the glass color to smoky teal, add faint condensation, and match the three-quarter tabletop framing from image 2. Do not add extra props, text, or background clutter.
```

## 重要な出力制御

### ãµã¤ãº

OpenAI のガイドは `gpt-image-2` の明示的な `WIDTHxHEIGHT` サイズに対してこれらの制約を文書化している:

- 最大エッジ長 `<= 3840`
- 両エッジは `16` の倍数でなければならない
- アスペクト比は `3:1` を超えてはならない
- 総ピクセル数は `655,360` から `8,294,400` の間でなければならない

一般的なドキュメント化されたサイズ:

- `1024x1024`
- `1536x1024`
- `1024x1536`
- `2048x2048`
- `2048x1152`
- `3840x2160`
- `2160x3840`
- `auto`

### åè³ª

- ドラフト、サムネイル、低コストなイテレーションには `low` を使う。
- 通常のデザインイテレーションには `medium` を使う。
- ディテールが実質的に重要な最終アセットには `high` を使う。
- ブリーフが特定の quality レベルを強制することを正当化しない場合は `auto` を使う。

### Format と Compression

- `png`: ロスレスのデフォルト。最大の忠実度が必要なときに最適。
- `jpeg`: より小さく高速。OpenAI は JPEG が PNG より速いと指摘している。
- `webp`: モダンなWeb配信で強力な圧縮が必要なときに適している。
- `output_compression`: `jpeg` または `webp` のみで使用すること。

### èæ¯

`gpt-image-2` では:

- `opaque`
- `auto`

このモデルでは透過背景はサポートされていない。

## バンドルスクリプトの使用

1枚以上の画像を生成する:

```bash
OPENAI_API_KEY=... \
python3 scripts/gpt_image_generate.py \
  --prompt "Premium olive oil bottle product shot on a clean stone surface, soft shadows, editorial lighting" \
  --out-dir tmp/olive-oil \
  --size 2048x2048 \
  --quality medium \
  --output-format webp \
  --output-compression 80
```

複数のリファレンス画像から編集する:

```bash
OPENAI_API_KEY=... \
python3 scripts/gpt_image_edit.py \
  --image refs/identity.png \
  --image refs/layout.png \
  --prompt "Use image 1 for identity and image 2 for composition. Keep the same bottle silhouette and label placement. Change the liquid to deep amber and add subtle highlights." \
  --out-dir tmp/bottle-edit \
  --size 1536x1024 \
  --output-format jpeg \
  --output-compression 70
```

便利なフラグ:

- `--filename-prefix hero`
- `--user trace-id-123`
- `--print-json`

## 避けるべきアンチパターン

❌ **アンチパターン: `gpt-image-2` を透過切り抜きモデルとして扱う**
問題: OpenAI はこのモデルで透過背景がサポートされないことを明示的に文書化している。
改善策: `opaque` または `auto` を使うか、透過が必須要件の場合は別のモデルを選ぶ。

❌ **アンチパターン: デフォルトで巨大な画像を強制する**
問題: 大きな画像はすべてのタスクに役立つわけではなく、コストとレイテンシが上がる。
改善策: 探索時は `1024x1024`、`1536x1024`、`1024x1536`、または `low` quality から始める。

❌ **アンチパターン: `png` に `output_compression` を使う**
問題: 圧縮制御は `jpeg` と `webp` に対してドキュメント化されており、`png` には対応していない。
改善策: 圧縮が要件の場合は `jpeg` または `webp` を使う。

❌ **アンチパターン: リファレンス画像を送りすぎる**
問題: 編集はすでに高精度の画像入力で処理されるため、余分なリファレンスは複雑さとコストを増加させる。
改善策: 必要最小限のアンカーセットを送り、各画像の役割を明確にラベル付けする。

❌ **アンチパターン: prompt サラダ**
問題: 矛盾するスタイルと構図のキューが指示への従順性を弱める。
改善策: 1つの明確な構図と1つの支配的なレンダリング方向を指定する。

❌ **アンチパターン: すべての prompt をゼロから即興で作る**
問題: prompt 品質が不安定になり、プロダクション用の prompt が管理しにくくなる。
改善策: このスキルのコンパクトな prompt スキャフォールドを使い、テキスト重視・マルチ画像・スケッチからレンダーへのケースには `references/openai-prompting-guide.md` を参照する。

❌ **アンチパターン: API を実行する前に成功を主張する**
問題: 提案された prompt は生成済みアセットではない。
改善策: 認証情報が利用可能な場合はスクリプトを実行し、生成が実行されなかった場合は明確に報告する。

## バリエーションガイダンス

**重要**: すべてのリクエストを1つの洗練された統一スタイルに集約しないこと。

- 成果物によって prompt の強調点を変える: プロダクトレンダー、アイコン、キャラクターアート、シーンアート、編集リクエストはそれぞれ異なる構造が必要。
- 用途に基づいてサイズとフォーマットを変える: Web配信、レビュー用画像、マーケティングクロップ、大型アートボードはそれぞれ異なるニーズがある。
- 仕様の詳細度を変える: 文字通りのプロダクトショットは、ゆるいコンセプト探索より厳密な制御が必要。
- ユーザーが意図的に統一したセットを構築している場合にのみ、ビジュアル方向性を再利用する。

## リファレンス

- API/モデルのノート: `references/openai-gpt-image-2.md`
- promptパターン: `references/openai-prompting-guide.md`
- 実行可能なジェネレータ: `scripts/gpt_image_generate.py`
- 実行可能なエディタ: `scripts/gpt_image_edit.py`
- 公式モデルページ: https://developers.openai.com/api/docs/models/gpt-image-2
- 公式ガイド: https://developers.openai.com/api/docs/guides/image-generation
- 公式 Images API リファレンス: https://developers.openai.com/api/reference/resources/images
- 公式 prompting ガイド: https://developers.openai.com/cookbook/examples/multimodal/image-gen-models-prompting-guide

## 覚えておくこと

このスキルは `gpt-image-2` を儀礼的にではなく、実用的に機能させるためのものだ。

リクエストを具体的な仕様に変換し、パラメータを意図的に選択し、可能な場合は API を実行し、実際の出力パスをユーザーに報告すること。
