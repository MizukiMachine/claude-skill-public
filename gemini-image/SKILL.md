---
name: gemini-image
description: "Call the Google Gemini/Imagen image API directly for one-off image generation and editing: model selection across Gemini 3 Pro Image, Gemini 3.1 Flash Image, and Gemini 2.5 Flash Image (Nano Banana), prompt construction, multi-turn editing, multi-image reference composition, character consistency, thinking-mode planning, Google Search-grounded visuals, and runnable generateContent CLI wrappers. Use when the task is generating or editing images at the API/CLI layer (not building an app); requires a Gemini/Google API key. For building full-stack web apps and product features on top of these models, use nano-banana-builder instead."
metadata:
  short-description: "Gemini image generation + editing via generateContent, prompting, and API wrapper."
---

# Gemini Image

このスキルは、ユーザーがGoogle Gemini画像モデルによる画像生成・編集を求める場合、またはモデルの明示的な選択・複数画像参照・マルチターン精錬・grounded画像生成が必要な場合に使用する。

## 考え方: 1つのAPI、3つのモデル、意図を持って選ぶ

Googleは画像生成を、他のGemini機能と同じ `generateContent` endpointで提供する。最初に考えるべきは「どのpromptか」ではなく、「どのモデルか、どの `imageConfig` か、どのreferenceを使うか、そしてthinkingはトークンコストに見合うか」だ。

**生成前に確認すること:**
- 成果物の種類: コンセプトアート、マーケティングビジュアル、製品レンダリング、編集パス、インフォグラフィック、スクリーンショット、キャラクター一貫セットのどれか?
- 適切なモデル: Pro（thinking・高品質）、3.1 Flash（バランス重視・最広アスペクト比・画像付きSearch grounding）、2.5 Flash / Nano Banana（最安・最速・1K上限）のどれか?
- 呼び出しをまたいで維持すべき要素: キャラクターのアイデンティティ、パレット、レイアウト、ブランドテキスト、アスペクト比のどれか?
- promptに対して推論が必要か（多段階レイアウト、インフォグラフィック、世界観構築）、それとも直接レンダリングで十分か?
- 目標は1枚の画像か、それともユーザーは反復編集のためにマルチターンチャットが必要か?

**基本原則**:
1. **モデル選択はパラメータ**: 3 Pro・3.1 Flash・2.5 Flashは互換ではない — 解像度の上限、reference容量、アスペクト比、thinkingの有無が異なる。
2. **`imageConfig` はpromptの一部**: `aspectRatio` と `imageSize` はフレーミング、トークンコスト、アセットの有用性に実質的な影響を与える。
3. **referenceには役割がある**: 複数の入力画像を送る場合、画像を一括で渡すのではなく、各画像の役割をpromptで明示すること。
4. **thinkingは有償の計算**: レイアウトや推論が重いブリーフには有効にし、直接レンダリングにはスキップする。
5. **実際を誇張しない**: APIが実際に呼び出され、バイトがディスクに書き込まれた後にのみ、画像が生成されたと述べること。

## Gemini画像モデルの使い方

Gemini APIは `POST /v1beta/models/{model}:generateContent` を通じて画像生成を提供する。画像出力は `generationConfig.responseModalities = ["TEXT", "IMAGE"]` で有効にする。画像バイトは `candidates[0].content.parts[].inlineData` にbase64でインライン返却される。

利用可能な画像モデルは3種類:

- `gemini-3-pro-image-preview` — Proティア、thinkingがデフォルトでオン、最大4K、最大6オブジェクト + 5キャラクターref。
- `gemini-3.1-flash-image-preview` — バランス最良、最大4K、14種のアスペクト比、最大10オブジェクト + 4キャラクターref、web + image search grounding。
- `gemini-2.5-flash-image` — Nano Banana; 速度・コスト最適化、1K上限、最大3 reference画像、thinkingなし。

すべての出力にSynthIDウォーターマークが含まれる。透過背景は非対応。これらのモデルは音声・動画の入力を受け付けない。

以下のreferenceを積極的に参照すること:

- `references/gemini-image-models.md` — モデルバリアント、`imageConfig`、reference制限、pricing-shaped token costs
- `references/gemini-prompting-guide.md` — prompt構造、マルチ画像reference、マルチターン編集、thinking、grounding

### このスキルを使うべき場面

- ユーザーがGemini画像生成またはNano Bananaを求めている。
- ユーザーがGeminiで画像を会話形式で編集したい。
- ユーザーがreference画像を使って複数レンダリング間でキャラクターや製品の一貫性を保ちたい。
- ユーザーがGoogle Searchを通じてgrounded画像（実在製品、最近のイベント、場所など）を求めている。
- ユーザーが画像出力用の `generateContent` runnable wrapperを求めている。
- ユーザーがGeminiを `gpt-image-2`・`gpt-image-1.5`・fal-hosted modelsと比較したい。

ユーザーがこれらのモデルを使ったNext.jsやWebアプリを構築する場合は、フルスタックパターン向けの既存スキル `nano-banana-builder` を優先すること。このスキルはAPI/CLIレイヤーに留まる。

### モデル選択

| ニーズ | 推奨モデル |
|---|---|
| 最高品質・複雑レイアウト・インフォグラフィック・多段階推論 | `gemini-3-pro-image-preview` |
| 最多アスペクト比・最多reference・image-search grounding・コストバランス | `gemini-3.1-flash-image-preview` |
| 安価な反復・クイックドラフト・1Kのシンプルなprompt | `gemini-2.5-flash-image` |
| 透過切り抜き | なし — `gpt-image-1.5` または別モデルを使用 |
| ネイティブスプライトアート / ピクセルアート | なし — `retro-diffusion` または `gpt-image-2` を使用 |

### API選択

- 一発生成・編集・reference駆動合成には `generateContent` を使う。
- 各ターンが前の画像を精錬するマルチターン反復編集には、chat sessionパターン（Python `client.chats.create`、JS `ai.chats.create`）を使う。
- 多数の画像が必要で最大24時間の待機を許容できる場合は**Batch API**を使う（レートリミットが高くなる）。
- ユーザーが直接ローカルwrapperを求める場合はバンドルスクリプトを使う。

## 生成ワークフロー

1. 成果物・不変条件・目標アスペクト比/サイズを特定する。
2. モデルを選ぶ: 高品質推論は3 Pro、バランス重視のデフォルトは3.1 Flash、安価なドラフトは2.5 Flash。
3. ブリーフに合った順序でpromptを草稿する:
   - 用途またはアセット種別
   - 被写体
   - シーンまたは背景
   - 構図またはカメラフレーミング
   - スタイル / マテリアル / 時代
   - 照明 / カラートリートメント
   - テキスト要件（一字一句正確に、引用符で囲む）
   - 正確な制約と除外事項
4. `imageConfig` を意図的に選ぶ:
   - `aspectRatio`: モデルのサポートリストから選ぶ（`references/gemini-image-models.md` 参照）
   - `imageSize`: `"1K"`・`"2K"`（3.xのみ）・`"4K"`（3.xのみ）または `"512"` / `"0.5K"`（3.1 Flashのみ）
5. thinkingが有益か判断する:
   - 3 Pro: thinkingはデフォルトでオン; 直接レンダリングには `thinkingConfig.thinkingLevel: "minimal"` を使う
   - 3.1 Flash: thinkingはオプトイン; レイアウト重視の作業には `thinkingLevel: "High"` を設定
   - 2.5 Flash: thinkingなし
6. groundingが必要な場合（実在製品・最近のイベント・実在の場所）は `tools: [{"google_search": {}}]` を追加する。
7. `GEMINI_API_KEY`（または `GOOGLE_API_KEY`）が利用可能な場合、`scripts/gemini_image_generate.py` を実行する。
8. ユーザーが確認できるパスに出力を保存し、ファイルパスと使用モデルを報告する。

### Promptスキャフォールド

ブリーフが構造から恩恵を受ける場合、このコンパクトな仕様を使う:

```text
Intended use:
Subject:
Scene/backdrop:
Composition/framing:
Style/medium:
Lighting/mood:
Text (verbatim):
Aspect ratio:
Constraints:
Avoid:
```

実際のAPIリクエストでは、これは `contents[0].parts[0].text` の1つの文字列と `imageConfig` ブロックにマッピングされる。

### Prompt構成

本番向けのpromptを優先する:

```text
Editorial overhead shot of a single matcha latte on a pale linen runner, ceramic cup with a thin gold rim, faint steam, scattered loose-leaf tea, warm afternoon window light from the left, magazine-style negative space on the right for headline text, no people, no logos.
```

テキスト量が多いまたはレイアウトに敏感な作業では、promptをムード描写ではなくデザイン仕様として構成し、リテラルなコピーは一字一句引用符で囲む。

反復時は一度に1軸だけ変更する:
- 被写体のポーズまたはフレーミング
- マテリアルまたはパレット
- 照明方向
- 背景処理
- ディテールの密度

## 編集ワークフロー

Geminiは2通りの方法で編集を処理する:

- **シングルコール編集**: ソース画像と編集指示を1つの `generateContent` リクエストで送る。
- **チャットベース編集**: chat sessionを開いてソース画像を送り、その後テキストターンで精錬する。各ターンで新しい画像が返され、モデルは視覚的コンテキストを保持する。

編集とreference画像ワークフローのために:

1. 必要最小限の画像セットを送る。
2. promptで画像の役割を明示的にラベル付けする:
   - `image 1 = identity anchor`
   - `image 2 = layout/pose reference`
   - `image 3 = palette/material reference`
3. 両方を述べる:
   - 変更すべきもの
   - 変更してはいけないもの
4. 継続性が重要な場合は、全面的な再解釈より小さな変化を優先する。
5. 多数の出力間でキャラクターや製品の一貫性を保つには、すべての呼び出しで同じidentity anchor画像を送り、promptのanchor表現を一字一句維持する。
6. ローカル編集リクエストには `scripts/gemini_image_edit.py` を使う。

編集promptの例:

```text
Use image 1 as the identity anchor and image 2 as the composition guide. Keep the same character face, hair color, jacket pattern, and proportions from image 1. Change only the background to a rainy night street with neon signage, and match the three-quarter framing from image 2. Keep aspect ratio 16:9. Do not redesign the jacket, do not add new characters, do not add text.
```

### マルチターンチャット編集

反復精錬には、繰り返しの一発呼び出しではなくchat sessionを使う。モデルは以前の画像とpromptをコンテキストとして保持するため、「次にこうして...」「そして追加して...」「前のバージョンに戻してでも...」といったワークフローに強い。

実践的なルール: ユーザーが2回以上の修正を求めるならchatを開く。そうでなければone-shot。

## 重要な `imageConfig` の選択

### アスペクト比

- `gemini-3.1-flash-image-preview`: 1:1, 1:4, 1:8, 2:3, 3:2, 3:4, 4:1, 4:3, 4:5, 5:4, 8:1, 9:16, 16:9, 21:9
- `gemini-3-pro-image-preview` と `gemini-2.5-flash-image`: 1:1, 2:3, 3:2, 3:4, 4:3, 4:5, 5:4, 9:16, 16:9, 21:9

成果物に基づいてアスペクト比を選ぶ:
- 1:1: アイコン、製品タイル、ソーシャル正方形。
- 16:9: ヒーロー画像、スクリーンショット、マーケティングバナー。
- 9:16: 縦型モバイル、ストーリーコンテンツ。
- 21:9: シネマティックプレート。
- 4:5: エディトリアルポートレート。
- 1:4, 1:8, 4:1, 8:1（3.1 Flashのみ）: リボン、バナー、縦ストリップ。

### 画像サイズ

- `"512"` または `"0.5K"`: ドラフトとサムネイル（3.1 Flashのみ）。
- `"1K"`: 標準、3つのモデルすべてで利用可能。
- `"2K"`: 詳細作業、3.xモデルのみ。
- `"4K"`: 最終アセット、3.xモデルのみ。

トークンコストはサイズに比例して増加する。探索中は `1K` を維持し、ディテールが実質的に重要な場合にのみ `2K` または `4K` に上げる。

### Thinking

- `thinkingLevel: "minimal"` — 最速、推論が最も弱い。
- `thinkingLevel: "High"` — より強力なレイアウト計画、トークン消費が多い。
- 3 Pro: thinkingはデフォルトでオン; 無効にするには明示的に `"minimal"` を設定。
- 3.1 Flash: thinkingはオプトイン。
- 2.5 Flash: thinkingの調整なし。

thinkingトークンは `includeThoughts` の可視性に関わらず課金される。

### Grounding

`tools: [{"google_search": {}}]` を追加すると、Google Search経由で取得した実世界の事実に基づいて画像を生成する。実在製品・最近のイベント・実在の場所・実在の公人の外見（慎重に）に有効。

- 3.1 Flash: web + image search。
- 3 Pro と 2.5 Flash: web searchのみ。
- image searchパスは人物の画像を取得できない。

## バンドルスクリプトの使い方

1枚または複数枚の画像を生成する:

```bash
GEMINI_API_KEY=... \
python3 scripts/gemini_image_generate.py \
  --prompt "Editorial overhead shot of a single matcha latte on linen, magazine negative space on the right, warm window light" \
  --model gemini-3.1-flash-image-preview \
  --aspect-ratio 16:9 \
  --image-size 2K \
  --out-dir tmp/matcha
```

1枚または複数枚のreference画像から編集する:

```bash
GEMINI_API_KEY=... \
python3 scripts/gemini_image_edit.py \
  --image refs/identity.png \
  --image refs/layout.png \
  --prompt "Use image 1 for identity and image 2 for composition. Keep the same face and jacket. Change background to a rainy night street with neon signage." \
  --model gemini-3-pro-image-preview \
  --aspect-ratio 16:9 \
  --image-size 4K \
  --out-dir tmp/identity-edit
```

便利なフラグ:

- `--thinking-level minimal|High`
- `--google-search` (groundingを有効にする)
- `--filename-prefix hero`
- `--print-json`
- `--n 1` (呼び出しを繰り返すことで複数候補をリクエスト; APIは `generateContent` リクエストごとに1枚の画像を返す)

スクリプトは `POST /v1beta/models/{model}:generateContent` に `responseModalities=["TEXT","IMAGE"]` で呼び出し、インラインbase64をデコードして画像ファイルをディスクに書き込む。

## 避けるべきアンチパターン

❌ **アンチパターン: すべてのリクエストをデフォルトで3 Proにする**
問題点: Proのthinkingは推論を必要としないブリーフでトークンを無駄にする。ドラフト・シンプルな被写体・クイック反復では恩恵がない。
改善策: 3.1 Flashから始める。レイアウト・インフォグラフィック・多段階推論が重要な場合に3 Proへ移行する。

❌ **アンチパターン: 透過背景をリクエストする**
問題点: Gemini画像モデルは透過背景を生成しない。
改善策: 単色で描画してダウンストリームでキーアウトするか、ネイティブ透過アセット用に `gpt-image-1.5` に切り替える。

❌ **アンチパターン: reference画像を大量に積み上げる**
問題点: 各referenceが入力トークンを膨らませ、モデルのフォーカスを分散させる。2.5 Flashは合計3枚上限; 3.1 Flashでもタイトなセットが最善。
改善策: 必要最小限のidentity / layout / paletteアンカーだけを送り、promptで各画像の役割をラベル付けする。

❌ **アンチパターン: 6回の修正リクエストをone-shotする**
問題点: 各one-shot呼び出しで前バージョンの視覚的コンテキストが失われ、小さな変化が乖離する。
改善策: 反復精錬にはchat sessionを開く; モデルが前の画像をコンテキストとして保持する。

❌ **アンチパターン: 直接レンダリングでthinkingをデフォルトのままにする**
問題点: 3 Proはデフォルトでthinkingがオン; リテラルな製品ショットが不要な推論コストを支払う。
改善策: ブリーフが直接的な場合は `thinkingLevel: "minimal"` を設定する。

❌ **アンチパターン: 早期に4Kを強制する**
問題点: 4Kはアイデアの探索を助けることなくトークンコストを倍増させる。
改善策: 1Kで探索し、promptを確定させてから、2Kまたは4Kで再レンダリングして一度だけアップスケールする。

❌ **アンチパターン: Gemini画像を事実の証拠として使う**
問題点: Google Search groundingを使っても、レンダリングされた画像はスタイル化された再構成であり、引用ではない。
改善策: 画像が実在の被写体を反映しなければならない場合はgroundingを使うが、ソース・オブ・トゥルースではなくイラストとして扱う。

❌ **アンチパターン: APIを実行する前に成功を宣言する**
問題点: 提案されたpromptは生成されたアセットではない。
改善策: credentialが利用可能ならスクリプトを実行するか、生成が実行されなかったことを明確に述べてその理由を説明する。

❌ **アンチパターン: 再配布の判断でSynthIDウォーターマークを無視する**
問題点: すべてのGemini画像には見えないSynthIDウォーターマークが含まれる。
改善策: ユーザーが出所・帰属・「これはAI生成か」を尋ねる際にこれを提示する。

## バリエーションガイダンス

**重要**: すべてのGeminiリクエストを1つの洗練されたハウススタイルに収束させないこと。

- 成果物によってモデルを変える: ドラフトは2.5 Flash、バランス重視の作業は3.1 Flash、プレミアムで複雑なレイアウトは3 Pro。
- 用途によってアスペクト比を変える: アイコンは正方形、ヒーローは16:9、モバイルは9:16、シネマティックは21:9、エディトリアルは4:5。
- 段階によって画像サイズを変える: 探索中は1K、確定時にのみ2K/4K。
- ブリーフによってprompt構造を変える: リテラルな製品ショットは厳密な制約が必要; スタイライズドなイラストはより多くのレンダリング方向が必要; インフォグラフィックは明示的なテキストとレイアウトが必要。
- ユーザーが意図的に一貫したセットを構築する場合にのみidentity anchorを再利用する。

## 参考資料

- モデルバリアントとパラメータ: `references/gemini-image-models.md`
- Promptパターン: `references/gemini-prompting-guide.md`
- Runnable generator: `scripts/gemini_image_generate.py`
- Runnable editor: `scripts/gemini_image_edit.py`
- 公式ガイド: https://ai.google.dev/gemini-api/docs/image-generation

## 覚えておくこと

このスキルはGemini画像生成を儀礼的なものではなく、実用的なものにすること。

モデルを選び、意図を持って `imageConfig` とthinkingを設定し、credentialが存在する場合はAPIを実行し、実際の出力パスと使用モデルをユーザーに報告する。
