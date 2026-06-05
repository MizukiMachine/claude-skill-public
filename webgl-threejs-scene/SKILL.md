---
name: webgl-threejs-scene
description: "Three.jsとWebGLのWeb体験を構築、デバッグ、改善、レビューする。3D scene、product viewer、GLTF/GLB model loading、animation mixer、OrbitControls、lighting/material、post-processing、shader、responsive renderer、シンプルな3Dゲームを含む。Three.jsコードの作成/修正、空白canvasや壊れたimportの診断、model scale/orientation/anchorの修正、3D interaction追加、canvasベースWebアプリの視覚検証が必要なときに使う。"
---

# Three.js Builder

## 目的

このスキルを使って、正しいimport・安定したscene設定・キャリブレーション済みの3D参照フレーム・実ブラウザでの検証を備えた、動作するレスポンシブなThree.js体験を制作する。出力は飾りのコードサンプルではなく、使用可能なscene・ゲーム・viewer・または修正であること。

## 動作モデル

Three.jsの作業はscene-graphの構築とレンダリング検証である。見た目の結果はすべて、5つの契約が正しく守られているかどうかに依存する: モジュールロード、カメラ/フレーミング、ライティング/マテリアル、オブジェクトのtransform、canvas/レイアウト統合。

優先順位:

1. ユーザーの実プロジェクト/ランタイムでの非空白レンダリングcanvas
2. 正しい参照フレーム: 軸・前方方向・アンカー・単位・カメラ基底
3. スタンドアロンスニペットより先にプロジェクトネイティブ統合
4. 再利用・ピクセル比の上限設定・drawコール数の制限によるパフォーマンス
5. レンダリングタイミング・入力ルーティング・DOM overlayの所有権の正確な管理
6. 要求されたscene・ゲーム・product viewerに合ったビジュアルの洗練

作業前に以下を確認する:

- 既存スタック: npm/Vite/React/Next/static HTML、インストール済みの`three`バージョン、アセットパス、利用可能なスクリプト
- Sceneの目的: ショーケース・product viewer・ゲーム・背景・データ可視化・デバッグ/キャリブレーション
- アセットの制約: 手続き型プリミティブ・GLTF/GLB・テクスチャ/HDR・アニメーションクリップ・圧縮・想定スケール
- UI統合: フルブリードcanvas・埋め込みコンポーネント・DOM HUD・ツールバー・モーダル・ラベル・セーフエリア・ポインタ/キーボードの所有権
- 検証対象: devサーバーURL・静的ファイル・スクリーンショット・インタラクションテスト・ビルドコマンド

## 参照ファイル

現在のタスクに必要なファイルのみ読む。

| トピック | ファイル | 使用タイミング |
|-------|------|----------|
| Scene設定 | [scene-patterns.md](references/scene-patterns.md) | renderer/camera/ライト/マテリアルの作成、importの選択、コントロールの追加、空白の基本sceneの修正 |
| GLTF/GLBモデル | [gltf-loading-guide.md](references/gltf-loading-guide.md) | モデルのロード・キャッシュ/クローン・SkeletonUtils・アニメーション・Draco/KTX2・正規化・disposal |
| 参照フレーム | [reference-frame-contract.md](references/reference-frame-contract.md) | 方向・アンカー・スケール・カメラ相対移動・浮いているモデル・逆転したコントロール・color-spaceの問題の修正 |
| ゲームパターン | [game-patterns.md](references/game-patterns.md) | Three.jsゲームの構築・アニメーションステートマシン・固定カメラ・オブジェクトプール・時間スケーリング・DOM HUD同期・終了状態 |
| 高度なトピック | [advanced-topics.md](references/advanced-topics.md) | post-processing・shader・raycasting・instancing・物理演算・ラベル・パフォーマンス診断の追加 |
| GTLFキャリブレーションヘルパー | [install-gltf-calibration-helpers.py](scripts/install-gltf-calibration-helpers.py) | 軸・バウンズ・前方方向・モデルラベルを可視化するためのバンドル済みヘルパーをプロジェクトにインストール |

## ワークフロー

1. 編集前にプロジェクトの構成を把握する。
   - `rg --files | rg '(^|/)(package.json|vite|next|src|app|pages|components|public|assets|static|models|textures|index.html)'`を使う。
   - `rg -n "from ['\"]three|GLTFLoader|OrbitControls|WebGLRenderer|setAnimationLoop|requestAnimationFrame|ResizeObserver|pointer-events|data-role|HUD|ui-layer|scene-layer" .`でpackageスクリプト・Three.jsのimport・レンダーループ・UIレイヤーを調査する。
   - インストール済みの`three`パッケージと既存のビルドツールを優先する。スタンドアロンのstatic HTMLの場合はimport mapを使い、coreとaddonsで一貫して一つのThree.jsバージョンに固定する。

2. 最小限かつ持続可能な実装パスを選ぶ。
   - 既存アプリ: コンポーネント/モジュールスタイルで統合し、アンマウント時にrenderer/リスナーをクリーンアップし、グローバルな副作用を避ける。
   - 静的ページ: 最小限の`index.html`とモジュールコード、またはインラインモジュールスクリプトを作成する。
   - ゲーム: エフェクトを追加する前に、状態・入力・レンダリングタイミング・カメラ規約・DOM HUD所有権・終了ラッチを定義する。
   - GLTF作業: まず1つのモデルでキャリブレーションし、その後多数のモデルに展開する。

3. Sceneの契約を構築する。
   - Renderer: 必要な場合のみantialias、`setPixelRatio(Math.min(devicePixelRatio, 2))`、親要素ベースのリサイズ処理、`outputColorSpace = THREE.SRGBColorSpace`。
   - Camera: 位置・ターゲット・near/farプレーン・レスポンシブなアスペクト/フラスタム更新、DOM UIが画面スペースを占有する場合のコンポジションオフセット。
   - ライティング/マテリアル: non-Basicマテリアルに十分な照明、意図的にtintingしない限りatlasテクスチャの色を保持する。
   - Scene graph: 関連オブジェクトをグループ化し、geometry/マテリアルを再利用し、フレームごとのコードをtransform/状態更新に限定する。

4. インタラクションとアニメーションを実装する。
   - レンダー所有者を一つにする。継続的なアニメーション・WebXR・viewerコントロールには`renderer.setAnimationLoop`を優先し、状態変化がレンダリングを駆動する場合はゲームエンジンの`requestAnimationFrame`またはオンデマンドの`renderFrame()`パスを使う。
   - ゲームには`THREE.Clock`を使い、大きな`dt`値をクランプする。
   - `OrbitControls`はダンピング/自動回転が必要な場合のみ更新する。
   - アクセシビリティ・ローカライズ・フォーカス・長いテキストが必要な場合は、DOM HUD・メニュー・フォームコントロールをWebGLシーンの外に置く。
   - フレームループ内でのオブジェクト割り当て・geometry作成・ローダー呼び出しを避ける。

5. 実ブラウザで検証する。
   - リポジトリで利用可能な`lint`・`typecheck`・`test`・`build`スクリプトを必要に応じて実行する。
   - アプリがdevサーバーを必要とする場合はそれを起動し、static GLTF/CDNインポートの場合はシンプルなローカルサーバーを起動する。
   - ユーザー向けsceneのデスクトップ・モバイルスクリーンショットを撮る。
   - canvas/WebGL作業では、canvasが非空白・正しくフレーミング・レスポンシブ・要求通りのアニメーション/インタラクション・コンソールエラーなしであることを確認する。
   - DOM overlayが存在する場合、重要な3Dコンテンツを隠していないこと・ポインターイベントが意図したレイヤーに届くこと・キーボードフォーカスがゲームプレイやコントロールを壊さないことを確認する。

## コアパターン

モダンなESモジュールを使う:

```js
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
```

CDN/static HTMLの場合は、import mapを使い、すべてのThree.js URLを同じバージョン・同じCDNに揃える。以下のサンプルはそのままコピー可能だが、プロジェクトにすでにThree.jsバージョンが存在する場合はバージョンを混在させず一致させること:

```html
<script type="importmap">
{
  "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
  }
}
</script>
```

GTLFキャリブレーションは、ヘルパーをターゲットプロジェクトにインストールする:

```bash
python3 /home/mizuki2/.claude/skills/webgl-threejs-scene/scripts/install-gltf-calibration-helpers.py \
  --out ./gltf-calibration-helpers.mjs
```

正規化/yawオフセットの後、プロジェクトモジュールからインポートする:

```js
import { attachGltfCalibrationHelpers } from './gltf-calibration-helpers.mjs';

attachGltfCalibrationHelpers({
  scene,
  root: modelRoot,
  label: 'Hero',
  showGrid: true,
  boundsMode: 'mesh',
});
```

## アンチパターン

**空白sceneの当て推量**

悪い理由: 空白canvasの原因は通常、importエラー・カメラ/フラスタムの誤り・ライトなし・不可視マテリアル・サイズゼロのcanvas・CORSやアセットパスの問題である。

改善策: sceneを書き直す前に、コンソールエラー・canvasサイズ・カメラターゲット・ライト/マテリアルの互換性・実際のアセットネットワークパスを確認する。

**GTLFオフセットのルーレット**

悪い理由: ランダムな`position.y`修正を積み重ねると、次のモデルやアニメーションが壊れる。

改善策: アセットクラスごとにアンカールールを定義し、ラッパーに一度だけ正規化し、ヘルパーでバウンズ/前方方向をキャリブレーションする。

**フレームごとの割り当て**

悪い理由: アニメーションループ内でgeometry・マテリアル・ベクター・ローダー・DOMノードを作成すると、ガベージコレクションとフレームドロップが発生する。

改善策: 再利用可能なオブジェクトを一度だけ割り当て、ループ内ではtransformやバッファ属性のみを変更する。

**競合するレンダーループ**

悪い理由: 所有権なしで`setAnimationLoop`・ゲームの`requestAnimationFrame`・アドホックなエフェクトループを同時に実行すると、二重レンダリング・HUD状態の非同期・disposal後もレンダリングが継続する問題が起きる。

改善策: 継続的なループ所有者を一つ選ぶか、rendererをイベント駆動にして短い所有rAFエフェクトを使う。すべてのループパスをdispose/キャンセルする。

**Canvas/HUDのずれ**

悪い理由: 正しくレンダリングされたsceneでも、DOMパネルが被写体を覆っていたり・ポインターイベントが傍受されたり・リサイズロジックが間違った要素を読んでいたりすると使えなくなる。

改善策: canvasレイアウト・カメラコンポジション・セーフゾーン・DOM HUDのz-index/ポインタールールをThree.js統合契約の一部として扱う。

**汎用の3Dデモ**

悪い理由: デフォルトキューブとデフォルトライティングは、ユーザーがゲーム・product viewer・背景・可視化のどれを要求しているかを無視している。

改善策: 要求されたユースケースに合わせてカメラ・マテリアル・モーション・コントロール・密度を選択する。

## バリエーションガイダンス

以下に基づいてバリエーションを変える:

- Product viewer: リアルなライティング・PBRマテリアル・orbit controls・ロード状態・ズームの制限・ニュートラルな背景
- ゲーム: 固定または制約付きカメラ・レスポンシブな入力・ステートマシン・プールされたオブジェクト・明確なコリジョン/デバッグビュー・読みやすいコントロール/ステータス用DOM HUD・空間状態のWebGLキュー
- ショーケース/ポートフォリオ: シネマティックなコンポジション・意図的なパレット・繊細なモーション・レスポンシブなフレーミング
- データ可視化: 読みやすいスケール・ラベル・raycasting選択・一貫したカラーレジェンド・パフォーマンスを意識したinstancing
- 背景エフェクト: 低コントラスト・スローモーション・インタラクション削減・厳格なパフォーマンス予算

以下には収束しないようにする:

- すべてのリクエストに同じ回転するキューブやパーティクルフィールド
- コンテンツをフレーミングせずに`camera.position.z = 5`をハードコード
- CDNとnpmのimport、または異なるThree.jsバージョンの混在
- GTLFモデルがすべて同じスケール・原点・前方方向を持つかのように扱う

## 検証

要求された動作を証明する最小限のチェックを使う:

- ビルドチェック: スクリプトが存在する場合は`npm run lint`・`npm run typecheck`・`npm test`・`npm run build`
- ランタイムチェック: ブラウザコンソールがクリーン・ネットワークアセットのロード・WebGLコンテキストエラーなし
- ビジュアルチェック: デスクトップ・モバイルスクリーンショット、canvas非空白、sceneのフレーミング、UIオーバーラップなし、リサイズ動作
- インタラクションチェック: orbit/ポインタ/キーボード/タッチの動作がリクエストに一致、DOM overlayがコントロール以外で入力を横取りしない
- GTLFチェック: アニメーションクリップ名のログ、アンカーのキャリブレーション、前方方向の検証、クローンが独立してアニメーション

## 成果物

変更されたファイル・実装されたscene/ゲーム/viewerの動作・実行した検証コマンドとビジュアルチェック・devサーバーが起動している場合のローカルURL・不足しているアセットやテストされていないブラウザパスなどの残存リスクを返す。
