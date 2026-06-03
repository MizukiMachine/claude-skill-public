---
name: threejs-capacitor-android
description: "Build and ship Three.js apps on Capacitor Android with Vite and Gradle: GLTF loading, assets_index animation UI, OrbitControls mouse/touch mappings, and Android sync/run/signing troubleshooting."
---

# Three.js Capacitor Android

Capacitor を通じて Android ネイティブシェルで動作するインタラクティブな Three.js アプリを構築・リリースするスキル。
ウェブビルド出力、アニメーションコントラクト、コントロール、ネイティブの sync/run/signing ワークフローなど、障害が最も発生しやすい統合境界に焦点を当てる。

iOS ターゲットには `threejs-capacitor-ios` スキルを使用する。ウェブ/Three.js レイヤーは両者で同一であり、異なるのはネイティブシェル（Gradle/Android Studio vs SPM/Xcode）のみ。

## 哲学: 2つのランタイム、1つのコントラクト

プロジェクトを合意が必要な2つのシステムとして扱う:
- ウェブレンダラーランタイム（Three.js + Vite）
- ネイティブランタイムラッパー（Capacitor Android）

ほとんどの障害はコントラクトが暗黙的な場合に発生する。
ファイルパス、アニメーション名、ビルド出力、Android のビルド/signing の選択を明示的かつテスト可能にする。

**実装前に確認すること:**
- ウェブ出力ディレクトリ（`dist` または `www`）は何か、Capacitor の `webDir` と一致しているか?
- アニメーション名はハードコードされた文字列ではなくデータ（`assets_index.json`）から読み込まれているか?
- JDK は使用している Capacitor バージョンと一致しているか（Android Studio には互換 JDK が同梱されている。手動で設定する場合は Capacitor の環境セットアップドキュメントに従うこと — 例: Capacitor 8 → JDK 17+）、また `ANDROID_HOME`/SDK は設定済みか?
- デスクトップとタッチのコントロールは意図的にマッピングされているか、それとも製品 UX に合わない可能性のあるデフォルトに任せているか?

**コア原則:**
1. コントラクトファーストのデータフロー: UI とアニメーション再生はコード内のアドホックなクリップ名ではなく JSON メタデータから導出すること。
2. ツールチェーンファーストの Android セットアップ: アプリロジックのデバッグを始める前に JDK + Android SDK + Gradle を揃えること。
3. 対称コントロール: デスクトップとモバイルの動作が一致するよう、マウスとタッチのマッピングを一緒に定義すること。
4. ビルド・sync の規律: ネイティブの実行はすべて最新のウェブアセットと sync に依存する。
5. 高速診断: 深いデバッグに入る前に、パス・クリップ名・アクション解決に対する小さなランタイムチェックを優先すること。

## クイックスタートワークフロー

1. Vite で Three.js アプリをビルドする（`npm run build`）。
2. 静的アセットは `public/` 以下に置き、絶対 URL（`/assets/...`）で読み込む。
3. Capacitor を `webDir: "dist"` で設定する。
4. Android プラットフォームを追加する（`npx cap add android`）。
5. 日常ループを繰り返す:
   - `npm run build`
   - `npx cap sync android`
   - `npx cap run android` または `npx cap open android`

コマンドレベルの詳細は `references/capacitor-android-workflow.md` を参照。

## 実装ガイドライン

### 1) プロジェクト構成

曖昧さを最小化するために、次の構成を推奨する:
- アプリコードは `index.html` と `src/*`
- GLB と JSON コントラクトは `public/assets/...`
- `capacitor.config.ts` に `webDir: "dist"`

Vite を使用する場合、すべてのランタイム fetch をブラウザと Android System WebView（Chromium）の両方に互換させること:
- 推奨: `fetch('/assets/assets_index.json')`
- 非推奨: 意図的に設定されていない限り、ファイルシステムパスや環境依存の base URL は避ける。

スキームに関する注意: Android はデフォルトで `https://localhost` から配信する（`server.androidScheme`）。絶対パスの `/assets/...` URL はこのスキームで正しく解決される。OS 固有のファイルシステムパスは避けること。

### 2) `assets_index.json` によるアニメーションコントラクト

単一の信頼できるデータソースを使用する:
- キャラクタースケルトン URL
- アニメーションソース URL
- 以下を含む `animations[]` エントリ:
  - 安定したアプリ ID（`idle`、`walk`、`run`）
  - `sourceClipName`（`AnimationClip.name` と完全一致）
  - ループモードとデフォルト値

ランタイムのパターン:
1. インデックス JSON を読み込む
2. スケルトン GLB とアニメーション GLB を読み込む
3. 各 UI ボタンを `sourceClipName` でクリップに対応付ける
4. アプリ ID をキーとする `AnimationAction` マップを構築する
5. インデックスのデフォルトアクションを再生する

`references/threejs-animation-index-pattern.md` を参照。

### 3) コントロール: デスクトップとタッチ

`OrbitControls` を使用し、マッピングを明示的に設定する:
- マウス:
  - 左 = 回転
  - ホイール = ドリー/ズーム
  - 右 = パン
- タッチ:
  - 1本指 = 回転
  - 2本指 = ドリー + パン

WebView がドラッグジェスチャーをページスクロール/ズームとして横取りしないよう、`canvas.style.touchAction = 'none'` を設定する。
製品が垂直方向のみのパンを要求する場合は、毎フレーム `controls.update()` の後にカメラの移動量を制限する。
この制約を追加する際に rotate/zoom のセマンティクスを無言で変更しないこと。
また、操作中にアプリが意図せず閉じないよう、`@capacitor/app` 経由で Android の**ハードウェアバックボタン**も処理すること。

### 4) パフォーマンスと安定性のガードレール

- ピクセル比を制限する: `Math.min(devicePixelRatio, 2)`（多くの Android 画面は 3x〜4x）。
- mixer/actions を再利用し、クリックごとに再生成しないこと。
- リサイズ時は常にカメラのアスペクト、プロジェクション、レンダラーサイズを更新する。
- アニメーションの切り替えはメタデータのデフォルトのフェードトランジションで行う。
- `webglcontextlost`/`webglcontextrestored` を処理する — Android はメモリ圧迫時やバックグラウンド移行時に GL コンテキストを積極的に破棄する。
- `@capacitor/app` の `pause` ライフサイクルイベントでレンダリングループを一時停止する。

### 5) Capacitor Android インテグレーション

ツールチェーンの要件:
- **Capacitor バージョンに対応した JDK** — 通常は別途インストール不要で、Android Studio に互換 JDK が同梱されている。`JAVA_HOME` を手動で設定する場合は Capacitor の環境セットアップドキュメントに従うこと（例: Capacitor 8 → JDK 17+）。
- **Android SDK + platform-tools**（`ANDROID_HOME` を設定し、`adb` を PATH に追加）。
- **Android Studio**（または CLI Gradle）— Windows、Linux（WSL2 含む）、macOS で動作。Mac は不要。

ネイティブ側の変更やプラグインの変更後は `npx cap sync android` を再実行すること。
リリースビルドには独自のキーストアが必要（デバッグビルドは自動署名される）。詳細はワークフローリファレンスを参照。

## 避けるべきアンチパターン

❌ **UI ハンドラにクリップ名をハードコードする**
問題: GLB でクリップ名が変更されると、ボタンが静かに壊れる。
改善策: `assets_index.json` からボタンをマッピングし、起動時に一度だけクリップ名を解決する。

❌ **不一致な JDK / 未設定の SDK**
問題: Gradle が "unsupported class file" / "SDK location not found" などの不可解なエラーで失敗する。
改善策: Android Studio に同梱されている JDK（または Capacitor ドキュメントが指定するバージョン）を使用し、`ANDROID_HOME`/`local.properties` を設定して `npx cap doctor` で確認する。

❌ **ウェブアセットを再ビルドせずに Android を実行する**
問題: デバイス/エミュレーターに古い JS/CSS が表示され、デバッグが誤解を招く。
改善策: `cap sync`/`cap run` の前に必ずビルドを行うスクリプトを使用する。

❌ **コントロールマッピングを暗黙的なままにする**
問題: デスクトップとモバイルの操作が UX 要件から乖離し、WebView がタッチジェスチャーを横取りする。
改善策: `mouseButtons`/`touches` を明示的に設定し、canvas に `touch-action: none` を指定する。

❌ **ウェブコントラクトのエラーをネイティブから先にデバッグする**
問題: 問題の多くは JSON キーの欠落・不正なパス・未解決のクリップにあるにもかかわらず、Android Studio で時間を無駄にする。
改善策: インデックスの構造とクリップ解決に関する起動時のアサーション/ログを追加し、`chrome://inspect` で WebView のエラーを確認する。

## バリエーションガイダンス

**重要**: デフォルトで同一のビューワーを生成しないこと。
製品の意図に合わせて実装を調整する:
- キャラクターショーケース: 豊かなライティング、ゆっくりしたカメラダンピング、アイドルループを重視。
- ゲームプレイプロトタイプ: 高速トランジション、状態駆動のアニメーション切り替え、最小限の UI。
- アセット QA ツール: 診断オーバーレイ、クリップの長さ/トラック情報、欠落クリップの警告を明確に表示。

少なくとも以下のディメンションを意図的に変化させること:
- ビジュアルスタイル（ライティング/背景/床の処理）
- 入力チューニング（ダンピング/ズーム/パン速度）
- アニメーション UX（ボタン、キーボードショートカット、自動再生戦略）

文脈がより多くを要求しているにもかかわらず、汎用的な「orbit + 3ボタン」の出力に収束しないようにする。

## リソースマップ

- `references/capacitor-android-workflow.md`
  - Android の正規セットアップ、ビルド/実行コマンド、signing
- `references/threejs-animation-index-pattern.md`
  - インデックスコントラクトとランタイム読み込みパターン
- `references/gotchas.md`
  - 高頻度な統合障害と修正方法

## まとめ

Three.js + Capacitor Android は、コントラクトが明示的でワークフローが規律正しい場合に成功する。
明確なメタデータコントラクトを構築し、コントロールを意図的にマッピングし、JDK/SDK ツールチェーンを揃え、build/sync/run を決定論的に保つこと。
