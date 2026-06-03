---
name: spritefusion-pixel-snapper
description: "Sprite Fusion Pixel Snapperを使って、ラスタ画像をグリッドに揃えたピクセルアートPNGへ変換または整える。アニメーションフレームのバッチで一貫したフレーム寸法やスプライトスケールを保つ必要がある場合はfixed-canvasワークフローを使う。pixelate、dot-art、pixel-snap、AI生成ピクセルアートの整理、ピクセルアート向け色量子化、アニメーションフレーム変換、固定フレーム寸法の保持、Hugo-Dz/spritefusion-pixel-snapperの実行を求められたときに発動する。"
---

# Sprite Fusion Pixel Snapper

## 目的

ラスタ画像の処理エンジンとして Hugo-Dz/spritefusion-pixel-snapper を使用する。このツールはソースピクセルを規則的なグリッドに揃え、色を厳密なパレットに量子化する。AI生成ピクセルアート、タイルマップ、アイソメトリックマップ、2Dゲームアセット、テクスチャに特に有効。

## 動作モデル

Sprite Fusion Pixel Snapper はグリッドスナッパーであり、固定解像度のリサイザーではない。上流の出力寸法は検出されたグリッドセル数（セル1個につき出力1ピクセル）から導出される。ソースキャンバスが同じでも、画像が異なれば出力サイズが異なる場合がある。ラッパーの `--preserve-aspect` は入力アスペクト比を維持するためにPNGをパディングするだけであり、`512x512` などの絶対サイズを保証するものでも、アニメーションフレーム間でキャラクタースケールを統一するものでもない。

アニメーションフレーム・スプライト・ゲームアセットでは、フレーム寸法を契約として扱う。ソースフレームが固定キャンバスを共有しており、ゲーム内での一貫したスケールが必要な場合は、ソースキャンバス全体を均一スケールで保持するか、fixed-canvasの後処理を使用する。全フレームの寸法と相対パスを検証するまで、上流のバッチ出力をそのまま最終成果物として受け入れてはならない。

透過性もビジュアル上の契約の一部である。PNGスプライトにおいて、RGBパレットサイズとalphaの保持は別の関心事である。出力のRGB色数を `8` に削減しても、ソフトエッジ用の多数のalpha値は保持できる。ユーザーが明示的にそのルックを求めない限り、alphaをフラット化・プリマルチプライ・ハードマスクしてはならない。ソースに多数の非ゼロalphaレベルがあるにもかかわらず出力の可視ピクセルが `A=255` のみであれば、それは変換失敗として扱う（透過の暗いエッジピクセルが不透明な黒いハローになる恐れがあるため）。

## インテントゲート

最終出力を生成する前に、ユーザーが変換で最適化したいことを確認する。バッチ・アニメーションフレーム・キャラクタースプライト・ゲームランタイムで使用される可能性のあるアセットに対して、この確認を暗黙で省略してはならない。

要求されたモードが明示されていない場合は、最終処理の前に短い質問をする:

```text
どちらを優先しますか？
1. Sprite Fusion grid-snap: グリッド補正の見た目優先。出力サイズは画像ごとに変わる可能性あり。
2. Fixed-canvas animation output: 全フレーム同じサイズ・同じキャラスケール優先。
3. まず代表フレームで比較サンプルを作る。
```

選択されたモードに必要な、不足しているパラメータのみを確認する:

- Sprite Fusion grid-snap の場合: 色数と出力パス。
- Fixed-canvas animation output の場合: 色数、出力パス、`512` や `512x512` のようなターゲットフレームサイズ。
- 比較サンプルの場合: 代表ソースフレーム、比較する色数、サンプル出力パス。

ユーザーがモードと必要なパラメータをすべて指定済みの場合、またはグリッド導出の出力サイズが明らかに許容できる単一画像の場合のみ、確認なしで進める。

## ワークフロー

1. 最終変換前にインテントゲートを実行する。望ましいトレードオフが不明な場合はモードの質問をする。
2. 指定された入力・出力パスを使用する。どちらかのパスが不明または曖昧な場合は確認する。PNG出力を優先する。
3. 変換前にアセットを分類する:
   - 単一画像・テクスチャ・マップ・クリーンアップサンプルは、上流の自然なグリッド導出の出力サイズを使用してよい。
   - アニメーションフレーム・キャラクタースプライト・アクションフォルダ・フレームシーケンス・スプライトシート入力は、バッチ変換前に寸法の契約が必要。
   - 固定フレームサイズや一貫したキャラクタースケールが重要な場合は、ターゲット出力キャンバスサイズを確認または推定し、出力パスを明示する。ソースアセットを上書きする代わりに新しいディレクトリに書き出すことを優先する。
4. 最終処理前に `k_colors` を決定する:
   - ユーザーが色数を指定した場合はその値を使用する。
   - 色数が未指定の場合は、最終またはバッチ変換の実行前に確認する。レトロ感を強くするなら `8`、バランスの良いピクセルアートなら `16`、シェーディングを保持したいなら `32` を提示する。
   - ユーザーが迷っている場合は、代表画像で `8`・`16`・`32` の比較サンプルを作成し、残りの画像に使う設定を確認する。
   - ユーザーがデフォルトを明示的に受け入れるか選択なしで進めるよう求めた場合のみ `16` を使用する。
5. 単一画像の作業では、まず自動検出のピクセルサイズを使用する。出力グリッドが正しくない場合のみ `--pixel-size N` を追加する。
6. アニメーションまたはフレームシーケンスの作業では、最終バッチ変換の前にキャリブレーションパスを実行する:
   - ソース画像数を数え、ソースPNGの寸法を確認する。
   - 異なるアクション・視点から代表フレームを変換する。
   - 視覚的なクオリティだけでなく、出力寸法とalphaの挙動を確認する。
   - ソースPNGに複数の非ゼロalpha値がある場合、ユーザーがハードエッジを明示的に要求しない限り、代表出力にも複数のalpha値が保持されるべきである。
   - fixed-canvasリサイズでは、プリマルチプライドalphaリサイズを使用し、パレット量子化の前にアンプリマルチプライする。透過の黒RGBが半透明エッジにブリードして暗く見えるため、ストレート/非関連付けRGBAを直接リサイズしてはならない。
   - 代表出力のサイズが異なる場合、上流の生出力は固定フレームアニメーションアセットとして受け入れられない。
7. 期待される出力の契約が明確になった後にのみ、適切なスクリプトを実行する:
   - グリッド導出の出力寸法が許容できる単一画像またはバッチには `scripts/pixel_snapper.py` を使用する。
   - 固定フレーム寸法と一貫したスプライトスケールが必要なアニメーションフレームには `scripts/fixed_canvas_pixelate.py` を使用する。このfixed-canvasスクリプトはソースキャンバスを均一スケールで保持し色を量子化する。上流のグリッドウォーカーは実行しない。
8. ユーザーが上流の生の寸法を明示的に求めない限り、ラッパーのデフォルトのアスペクト比保持を有効にする。上流のグリッドが入力のアスペクト比を変更する場合、ラッパーはPNGキャンバスを透過ピクセルでパディングする。
9. 出力を確認する:
   - 単一画像の場合、グリッドが粗すぎず細かすぎないことを確認する。必要であれば `--pixel-size N` で再実行する。
   - フレームバッチの場合、ファイル数・相対パスの一致・ユニークなフレーム寸法・可視ピクセルのRGB色数・alphaの保持を確認する。固定フレームが必要な場合に `ユニークなフレーム寸法 != 1` であれば、バッチを失敗として扱いfixed-canvasワークフローで再生成する。

## 失敗耐性バッチフロー

完全なアニメーションアセットセットを生成・置換する前に、このフローを使用する:

```text
classify asset
  -> record source count, dimensions, RGB count, alpha count
  -> choose fixed canvas size and color count
  -> generate one action/view sample in a new output directory
  -> verify sample:
       file count matches
       all dimensions match target
       visible RGB colors <= requested color count
       alpha is preserved when source has soft alpha
       RGB palette is built from sufficiently visible pixels, not from near-transparent edge pixels
       preview source/output on the same background
  -> only then run full batch
  -> verify the full batch with the same checks
```

いずれかの不変条件が満たされない場合、サンプルからフルバッチに進んではならない。新しい出力が検証を通過するまで、正常な出力を上書きしてはならない。

## アニメーションフレーム契約

入力がキャラクターアニメーション・フレームシーケンス・スプライトシートソースの場合は常にこの契約を使用する:

- ソースフレーム数と出力フレーム数は一致しなければならない。
- ユーザーが明示的に新しい構造を求めない限り、相対パスは一致するべきである。
- 変換前にソースフレームの寸法を記録するべきである。
- 最終バッチ変換前に必要な出力フレーム寸法を把握しなければならない。
- 全ての最終フレームPNGは同じ寸法でなければならない。
- キャラクタースケールは、画像ごとのコンテンツ境界からではなく、元のソースキャンバスから決定しなければならない。
- ユーザーがトリミングされたフレームを明示的に要求しアンカー/オフセット処理を承認しない限り、可視キャラクターに合わせてクロップしてはならない。
- alphaチャンネルの挙動は意図的なものでなければならない。デフォルトでソフトalphaを保持する。ユーザーがくっきりしたカットアウトエッジを明示的に求める場合のみハードalphaしきい値を使用する。
- `alpha > 0` のピクセルのRGB色数は、RGBA色数とは別に検証する。1つのRGBパレット色が多数のalphaレベルで現れる場合、多数のRGBA値は正常である。

ユーザーが「低解像度ピクセルアート」を求めながらもゲーム対応アニメーションフレームが必要な場合、上流の生のグリッドスナッピングよりもfixed-canvasダウンスケール＋パレット量子化が適切な場合がある。その場合は、Sprite FusionのグリッドデリバードOutputが固定フレームアニメーションに安全でないことを明示し、ソースディレクトリ構造を維持しながらfixed-canvasパイプラインを使用する。

## クイックコマンド

ユーザーがターゲットサイズと色数を選択した後にfixed-canvasアニメーションバッチを実行する:

```bash
python3 "<skill>/scripts/fixed_canvas_pixelate.py" --input-dir "input_dir" --output-dir "output_dir" --size 512 --colors 16
```

ユーザーが16色パレットを選択した後に実行する:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "output.png" --colors 16
```

バッチ内のPNG寸法を確認する:

```bash
python3 - <<'PY'
from pathlib import Path
import struct
root = Path("output_dir")
counts = {}
for p in root.rglob("*.png"):
    if "spritesheets" in p.parts:
        continue
    data = p.read_bytes()
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        size = struct.unpack(">II", data[16:24])
        counts[size] = counts.get(size, 0) + 1
print("unique sizes", len(counts))
for size, count in sorted(counts.items()):
    print(size, count)
PY
```

ソース/出力のパス一致を確認する:

```bash
out="output_dir"
comm -3 \
  <(find "input_dir" -type f -iname '*.png' -printf '%P\n' | sort) \
  <(find "$out" -path "$out/spritesheets" -prune -o -type f -iname '*.png' -printf '%P\n' | sort)
```

PNGバッチ内のRGBパレット数とalphaの保持を確認する:

```bash
python3 "<skill>/scripts/inspect_png_batch.py" \
  --root "output_dir" \
  --source-root "input_dir" \
  --require-single-size \
  --max-visible-rgb "<requested_color_count>"
```

`--source-root` を指定すると、インスペクターはデフォルトで最初に一致するソースファイル（`--source-check-limit 8`）を読み込んでソースセットがソフトalphaを使用しているか検出し、可視ピクセルを1つのalphaレベルに圧縮した出力を失敗とする。ソフトalphaフレームとハードエッジまたは完全不透明フレームが意図的に混在するアセットセットでは、徹底的なソース/出力alpha比較のために `--source-check-limit 0` を使用する。`--min-alpha-levels 2` は、全ての非空出力フレームにソフトalphaが含まれる場合のみ追加する。完全不透明または意図的にハードエッジのスプライトには使用しない。

比較サンプルを実行する:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "sample-8.png" --colors 8
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "sample-16.png" --colors 16
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "sample-32.png" --colors 32
```

ピクセルグリッドサイズを上書きする:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "output.png" --colors 16 --pixel-size 8
```

アスペクト比が変わっても上流の生の出力寸法を維持する:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "output.png" --colors 16 --no-preserve-aspect
```

クローン済みの上流リポジトリを使用する:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --repo "/path/to/spritefusion-pixel-snapper" --input "input.png" --output "output.png"
```

検証済みcommitではなく最新の上流checkoutに対して実行する:

```bash
python3 "<skill>/scripts/pixel_snapper.py" --input "input.png" --output "output.png" --ref main
```

## 要件

- Rust/Cargo がインストールされていること。
- 上流リポジトリがローカルに存在しない場合はGitが必要。
- システムで設定されているPythonコマンドが `python3` でない場合は `python` または `py -3` を使用する。
- `--repo` または `SPRITEFUSION_PIXEL_SNAPPER_REPO` が指定されない限り、ラッパーは `https://github.com/Hugo-Dz/spritefusion-pixel-snapper.git` をローカルキャッシュにクローンする。
- ラッパーはデフォルトで検証済みの上流commitをcheckoutする。別のcheckoutポリシーが必要な場合は `--ref main`、`--ref <commit-or-tag>`、または `--ref none` を使用する。
- ネットワークアクセス・キャッシュ書き込み・Cargoビルドがサンドボックスによってブロックされている場合は、ユーザーの承認を求め、必要な権限で同じコマンドを再実行する。

## スクリプトインターフェース

バンドルされたスクリプトは上流のRust CLIに委譲する:

```text
input output [k-colors] [--pixel-size N]
```

上流CLIは `k-colors` が省略された場合 `16` 色をデフォルトとするが、このスキルは最終またはバッチ変換の前にユーザーに意図した色数を確認するべきである。

スクリプトはCargoを次のように呼び出す:

```text
cargo run --release --manifest-path <repo>/Cargo.toml -- <input> <output> [k-colors] [--pixel-size N]
```

コマンドを実行せずに表示するには `--dry-run` を使用する。手動で管理するリポジトリでGit checkoutをスキップするには `--ref none` を使用する。

デフォルトでは、ラッパーは上流のPNG出力を `--preserve-aspect` で後処理する。検出されたグリッドが正方形のソースを長方形にするなど、ソースのアスペクト比が変わる場合、ラッパーはピクセルを引き伸ばすのではなく透過ピクセルで出力キャンバスをパディングする。正確な上流の寸法が必要な場合のみ `--no-preserve-aspect` を使用する。

重要: `--preserve-aspect` はソースの寸法を保持せず、全バッチ出力を1つのフレームサイズに正規化しない。上流の結果をパディングすることでソースのアスペクト比を保持するだけである。

fixed-canvasスクリプトはPNGフレームディレクトリを受け取る:

```text
--input-dir <dir> --output-dir <dir> --size <N|WIDTHxHEIGHT> --colors <k>
```

相対パスを保持し、ソースキャンバス全体を要求された出力キャンバスにリサイズし、各フレームを要求された色数に量子化する。リサイズ時は先にalphaをプリマルチプライし、量子化前にアンプリマルチプライする。デフォルトで全ての非ゼロalpha値を保持しながら、パレット選択から非常に低いalphaのピクセルを除外する（`--palette-alpha-threshold 16`）ことで、透過の暗いエッジピクセルがパレットエントリを消費しないようにする。非インターレースの8ビットグレースケール・RGB・グレースケールalpha・RGBA PNG入力をサポートする。アニメーションスケールの一貫性が上流のコンテンツ感応型グリッドスナッピングより重要な場合に使用する。

## トラブルシューティング

- グリッド検出が悪い: `--pixel-size N` で再実行する。上流の範囲は `1` から最小画像寸法の半分まで。
- アスペクト比が予期せず変わった: デフォルトの `--preserve-aspect` 動作を有効のままにする。呼び出し元が `--no-preserve-aspect` を使用していた場合は、それなしで再実行する。
- フレーム間でアニメーションキャラクターサイズが変わる: 上流のグリッドデリバードの出力寸法が異なっている。バッチを失敗として扱い、元のソースキャンバスから均一スケールの固定出力キャンバスで再生成する。
- フレームバッチに多数の出力寸法がある: 画像ごとに自動検出のピクセルサイズまたはコンテンツ感応型グリッドウォーキングが変化した。エンジンがフレームごとのオフセット/アンカーも受け取らない限り、アニメーションフレームとして出荷してはならない。
- 出力が暗く見えるか黒いハローがある: alphaがフラット化・プリマルチプライ・ハードマスクされた可能性がある。ソース/出力のalphaレベル数を比較する。fixed-canvasワークフローでソフトalphaを保持して再生成する。
- 出力が要求した色数を超えているように見える: RGBA色数とは別に可視RGB色数を確認する。ソフトalphaが保持されている場合、多数のRGBA色は想定内である。
- アスペクト保持でソース寸法の読み取りが失敗する: ソースをPNG・JPEG・GIF・BMPに変換するか、上流の生の寸法が許容できる場合は `--no-preserve-aspect` を渡す。
- 色数が少なすぎる: `--colors` を増やす。
- 色数が多すぎる、またはぼやけた結果: `--colors` を減らす。
- 非常に大きな画像: 処理前にリサイズする。上流は `10000x10000` を超える寸法を拒否する。
- Cargoがバイナリを見つけられない: リポジトリが最新であることを確認し、上流プロジェクトのルートから実行するか、ラッパーの `--repo` オプションを使用する。
- キャッシュが破損している: キャッシュパスは存在するが `Cargo.toml` がない場合は、その部分的なディレクトリを削除するか有効なcheckoutで `--repo` を渡す。
- Cargoが `src/main.rs` が `lib` と `bin` の両ターゲットに存在すると警告する場合がある。これは上流プロジェクトでは想定内であり、出力生成をブロックしない。

## 参考資料

正確な上流の使用詳細が必要な場合は `references/upstream.md` を参照する。
