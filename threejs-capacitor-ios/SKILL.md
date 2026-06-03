---
name: threejs-capacitor-ios
description: "Build and ship Three.js apps on Capacitor iOS with Vite and Swift Package Manager: GLTF loading, assets_index animation UI, OrbitControls mouse/touch mappings, and iOS sync/run troubleshooting."
---

# Three.js Capacitor iOS

ブラウザで動作し、Capacitor経由でiOSネイティブシェルに内包できるインタラクティブなThree.jsアプリを構築するスキル。
ほとんどの問題が発生する統合境界（webビルド出力・animationコントラクト・controls・ネイティブsync/runワークフロー）に重点を置く。

## 哲学: Two Runtimes, One Contract

プロジェクトを合意が必要な2つのシステムとして扱う:
- webレンダラーランタイム（Three.js + Vite）
- ネイティブランタイムラッパー（Capacitor iOS）

コントラクトが暗黙的な場合にほとんどの障害が発生する。
ファイルパス・animationの名前・ビルド出力・iOSパッケージマネージャーの選択を明示的かつテスト可能にすること。

**実装前に確認すること:**
- webの出力ディレクトリ（`dist` または `www`）は何か、Capacitorの `webDir` と一致しているか?
- animation名はハードコードされた文字列ではなく、データ（`assets_index.json`）から読み込んでいるか?
- iOSはSPMとCocoaPodsのどちらを使っており、プラグインの依存関係はその選択と互換性があるか?
- デスクトップとタッチのcontrolsは意図的にマッピングされているか、それともプロダクトUXと一致しないデフォルトのままか?

**コア原則:**
1. Contract-firstデータフロー: UIとanimation再生はJSONメタデータから導出し、コード内のad-hocなclip名には依存しない。
2. SPM-first iOSセットアップ: 特定のプラグインがCocoaPodsを強制する場合を除き、モダンなCapacitorではSwift Package Managerをデフォルトとする。
3. 対称的なcontrols: マウスとタッチのマッピングを一緒に定義し、デスクトップとモバイルの動作を揃える。
4. Build-syncの規律: すべてのネイティブ実行は最新のwebアセットとsyncに依存する。
5. 高速診断: 深いデバッグの前に、パス・clip名・action解決に対して小さなランタイムチェックを優先する。

## クイックスタートワークフロー

1. ViteでThree.jsアプリをビルドする（`npm run build`）。
2. 静的アセットは `public/` 以下に置き、絶対URL（`/assets/...`）で読み込む。
3. Capacitorを `webDir: "dist"` で設定する。
4. SPMでiOSプラットフォームを追加する（`npx cap add ios --packagemanager SPM`）。
5. 日々のループを繰り返す:
   - `npm run build`
   - `npx cap sync ios`
   - `npx cap run ios` または `npx cap open ios`

コマンドレベルの詳細は `references/capacitor-ios-spm-workflow.md` を参照。

## 実装ガイドライン

### 1) プロジェクト構成

曖昧さを最小化するため、以下の構成を推奨:
- `index.html` と `src/*` にアプリコード
- `public/assets/...` にGLBとJSONコントラクト
- `capacitor.config.ts` に `webDir: "dist"`

Viteを使う場合、すべてのランタイムfetchをブラウザとWKWebViewの両方で動作するように保つこと:
- 良い例: `fetch('/assets/assets_index.json')`
- 避けるべき例: 意図的に設定していない限り、ファイルシステムパスや環境固有のベースURL。

### 2) `assets_index.json` によるAnimationコントラクト

単一の信頼できる情報源を使う:
- キャラクタースケルトンのURL
- animationソースのURL
- `animations[]` エントリ（以下を含む）:
  - 安定したアプリid（`idle`・`walk`・`run`）
  - `sourceClipName`（`AnimationClip.name` の正確な値）
  - ループモードとデフォルト値

ランタイムパターン:
1. インデックスJSONを読み込む
2. スケルトンGLBとanimation GLBを読み込む
3. 各UIボタンを `sourceClipName` でclipに解決する
4. アプリidをキーとした `AnimationAction` マップを構築する
5. インデックスのデフォルトactionを再生する

`references/threejs-animation-index-pattern.md` を参照。

### 3) Controls: デスクトップとタッチ

`OrbitControls` を使い、マッピングを明示的に設定する:
- マウス:
  - 左ボタン = 回転
  - ホイール = dolly/ズーム
  - 右ボタン = パン
- タッチ:
  - 1本指 = 回転
  - 2本指 = dolly + パン

プロダクトが垂直方向のみのパンを必要とする場合、毎フレーム `controls.update()` の後にtarget/cameraの移動を制限する。
この制限を追加するとき、rotate/zoomのセマンティクスを暗黙的に変更しないこと。

### 4) パフォーマンスと安定性のガードレール

- ピクセル比を制限する: `Math.min(devicePixelRatio, 2)`。
- mixer/actionsは再利用し、クリックのたびに再生成しない。
- リサイズ時は必ずcameraのaspect・projection・rendererのサイズを更新する。
- animationの切り替えはメタデータのデフォルト値によるフェードトランジションで行う。

### 5) Capacitor iOS統合

Capacitor 8+ではデフォルトでSPMを使う。
既存のCocoaPodsプロジェクトは、意図的に移行すること（アシスタントまたはiOSプラットフォームの再作成）。

ネイティブ側の変更やプラグインの変更後は、再度 `npx cap sync ios` を実行する。

## 避けるべきアンチパターン

❌ **UIハンドラーにclip名をハードコードする**
問題点: GLB内のclipをリネームするとボタンが静かに壊れる。
改善策: `assets_index.json` からボタンをマッピングし、起動時に一度だけclip名を解決する。

❌ **SPMとCocoaPodsの前提を混在させる**
問題点: 依存関係のずれとXcodeプロジェクトの期待値の破損。
改善策: プロジェクトごとにパッケージマネージャーを1つに決める。モダンなセットアップではSPMを優先。

❌ **webアセットを再ビルドせずにiOSを実行する**
問題点: シミュレーターに古いJS/CSSが表示され、デバッグが誤った方向に進む。
改善策: `cap sync`/`cap run` の前に必ずビルドを行うスクリプトを使う。

❌ **controlsのマッピングを暗黙的なままにする**
問題点: デスクトップとモバイルの操作感がUX要件から乖離する。
改善策: `mouseButtons` と `touches` をコード内で明示的に設定する。

❌ **webコントラクトエラーに対してネイティブから先にデバッグする**
問題点: 問題の原因が通常はJSONキーの欠落・パスの誤り・未解決のclipであるのに、Xcodeで時間を無駄にする。
改善策: インデックスの構造とclip解決に対して起動時のアサーション/ログを追加する。

## バリエーションガイダンス

**重要**: デフォルトで同一のviewerを生成しないこと。
プロダクトの意図に合わせて実装を調整する:
- キャラクタショーケース: より豊かなライティング・遅いカメラダンピング・idleループの強調。
- ゲームプレイプロトタイプ: 素早いトランジション・状態駆動のanimation切り替え・最小限のUIクローム。
- アセットQAツール: 診断オーバーレイ・clip長/トラック情報・missing-clip警告を明確に表示。

意図的に以下のディメンションを変化させる:
- ビジュアルスタイル（ライティング/背景/床の処理）
- 入力チューニング（ダンピング/ズーム/パン速度）
- アニメーションUX（ボタン・キーボードショートカット・自動再生戦略）

文脈がより多くを求めているときに、汎用的な「orbit + 3ボタン」の出力に収束することを避ける。

## リソースマップ

- `references/capacitor-ios-spm-workflow.md`
  - iOSセットアップ・移行・実行コマンドの正典
- `references/threejs-animation-index-pattern.md`
  - indexコントラクトとランタイム読み込みパターン
- `references/gotchas.md`
  - 高頻度の統合障害と修正方法

## まとめ

Three.js + Capacitor iOSは、コントラクトを明示的にし、ワークフローを規律立てることで成功する。
明確なメタデータコントラクトを構築し、controlsを意図的にマッピングし、モダンなCapacitorではSPMを優先し、build/sync/runを決定論的に保つこと。
