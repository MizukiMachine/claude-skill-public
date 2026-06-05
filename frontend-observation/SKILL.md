---
name: frontend-observation
description: "推測ではなく実ブラウザで観察してフロントエンドUIを検証する。mcp-browser-observer MCP（browser_observe / browser_audit / browser_screenshot）を、段階的な判断ツリーで使う。まず軽くスクリーンショット、DOMやエラーが問題になるなら構造的に観察、何か壊れているときだけ複数ビューポートでフル監査する。フロントエンド変更後に実際に描画・動作するか確認したいとき、コンソールエラーやネットワーク失敗が疑われるとき、レスポンシブ/レイアウト崩れを確認したいときに使う。トリガー: 「見た目を確認」「UI確認」「observe the page」「check the UI」「レイアウト崩れ」「audit」「browser_observe」。"
metadata:
  short-description: "Real-browser UI verification via mcp-browser-observer; escalate screenshot→observe→audit."
  type: workflow
---

# Frontend Observation

コードだけを見て「完成した」と宣言する代わりに、**実際のブラウザで観察**してフロントエンドが正しくレンダリングされ動作することを確認する。このスキルは*判断*を担う — どの深さで確認するか。一方、`mcp-browser-observer` MCP は*能力*を担う（ブラウザの操作、DOM/console/network のキャプチャ、レイアウト候補のフラグ付け）。

## 責任分担

- **MCP = 能力。** ライブの Chromium セッションに対して実行し、構造化データとノブを返す。*いつ*または*どの程度*確認するかは判断しない。
- **このスキル = 判断。** 最も低コストな観察を選んで確信を得る。ノブを設定し、結果を解釈し（フラグ付きのレイアウト候補が本当のバグかどうか）、エスカレーションするかを決定する。

この境界を守ること：「いつ/どれを/どの程度」という判断を MCP に押し返さない。また `browser_evaluate` でここに MCP のキャプチャ/ヒューリスティックを再実装しない。

## 基本原則：トークンあたりの確信度

スクリーンショットのたびにモデルの注意とレイテンシが消費され、フル audit は実時間を消費する。「動いている」を反証しうる最も軽い観察から始め、シグナルがあったときだけエスカレートする。正直な軽いチェック1回は、反射的なフル audit に勝る。

## エスカレーション決定ツリー

**一度**ナビゲートし、状況が求める限りだけ段階を上げる：

```
0. browser_navigate (once)        → ページ / dev server URL を読み込む
        │
        ▼
1. browser_screenshot             → "見た目は正しいか？"
   - selector: 可能なら変更したコンポーネントだけをキャプチャ
   - 通常の視覚的変更ではこれが最初の確認
        │  何かおかしい、または DOM/エラー/状態が必要？ ↓
        ▼
2. browser_observe                → "DOM/console/network は何を示しているか？"
   - includeScreenshot:false + maxElements:20 で高速な診断パス
   - 1回の呼び出しで DOM アウトライン、インタラクティブ要素、フォーム、
     console エラー、ネットワーク失敗、レイアウト崩れ候補を返す
        │  エラーあり、原因不明、またはレスポンシブ/レイアウト崩れが疑われる？ ↓
        ▼
3. browser_audit                  → "複数の viewport で問題ないか？"
   - 編集ループ中: viewports:["desktop"], includeScreenshots:false
   - 調査時: viewports:["desktop","mobile"], includeScreenshots:true
```

**確信が得られる最も低い段階で止める。** 変更のたびに反射的に `browser_audit` を実行しない — 次の場合に限って使用する：エラーが発生している、原因が不明、またはレスポンシブ/レイアウト崩れが疑われる。

## ノブポリシー（このスキルが設定する；MCP はそれを公開するだけ）

| 状況 | ツール + ノブ |
|-----------|--------------|
| 通常の「見た目は正しいか」 | `browser_screenshot`（`selector` でスコープを絞る） |
| 高速診断 | `browser_observe` `{ includeScreenshot:false, maxElements:20 }` |
| 視覚とデータの両方が必要 | `browser_observe` `{ includeScreenshot:true }` |
| 編集ループの audit | `browser_audit` `{ viewports:["desktop"], includeScreenshots:false }` |
| 実際の問題を調査 | `browser_audit` `{ viewports:["desktop","mobile"], includeScreenshots:true }` |

## 結果の解釈（判断はここに宿る）

- **レイアウト崩れ候補は候補であり、確定ではない。** MCP はヒューリスティックに不審な overflow/overlap/clipping にフラグを立てる。バグと断定する前に、スクリーンショットとコンポーネントの意図に照らして確認すること — 意図的な横スクロールは「overflow」ではない。
- **console エラーはチェック失敗を意味する。** console/page エラーはすべて「未完成」として扱う。ただし無害であると説明できる場合（例：既知のサードパーティ警告）を除く。
- **ネットワーク失敗はオリジンによって重要度が異なる。** 自分の API へのリクエスト失敗は本物の欠陥；ブロックされたサードパーティのビーコンは通常そうではない。
- **動作確認にはピクセルではなく状態を使う。** インタラクションが機能したかを確認するには、スクリーンショットを目視するより `browser_extract` / `browser_evaluate` で状態を読む方が好ましい。

## 安定セッションワークフロー

MCP は呼び出し間で1つのライブブラウザセッションを保持する。これを活用する：

1. URL に `browser_navigate` するのは**一度だけ**。再ナビゲートは状態をリセットする（cookies/localStorage は `browser_reset` まで保持される）。
2. 以降の観察では **`url` を省略**して、現在の状態をそのまま観察する — `url` を渡すと再ナビゲートされる（`browser_audit` も viewport ごとに再ナビゲートする）。
3. `networkidle` よりも完了マーカーに対する `browser_wait { type:"selector" }` を優先する — polling/HMR アプリでは `networkidle` がタイムアウトまで待ち続ける。
4. あるアクションに対してのみ console/network の結果をスコープしたい場合は、そのアクションの前に `browser_clear_telemetry`（または `clearTelemetry` ノブ）を使用する。

## アンチパターン

❌ **些細な変更のたびに反射的なフル audit** → 遅く、トークン消費が多い。*改善策*: 最初はスクリーンショット；シグナルがあった時のみ audit。
❌ **観察のたびに再ナビゲート** → セッション状態が失われる。*改善策*: 一度ナビゲートし、以降は `url` なしで観察する。
❌ **ライブリロードアプリでの `networkidle` 待機** → タイムアウトする。*改善策*: 「準備完了」を示す selector で待機する。
❌ **レイアウト崩れ候補を確定バグとして扱う** → 誤検知。*改善策*: スクリーンショットと意図に照らして確認する。
❌ **`browser_evaluate` で観察を再実装** → MCP を再発明し、構造が失われる。*改善策*: `browser_observe` を使う。
❌ **ブラウザを一度も開かずに「完成」と宣言** → まさにこの MCP が防ぐために存在する失敗。

## 永続的なテストへの引き継ぎ

このスキルは「*今*正常か」に答えるものであり、「*今後も*正常であり続けるか」には答えない。フローが確認され安定したら、定着させる：**playwright-e2e** スキルに引き継いで CI で実行される永続的なリグレッションテスト（unit/component/E2E/visual）を作成する。両スキルは同じ `mcp-browser-observer` MCP を使う — このスキルは高速なインループ検証のため、playwright-e2e は永続的なセーフティネットのため。まずここで確認し、そこで定式化する。

## 「十分」の基準

フロントエンドの変更が検証済みとなるのは：
- [ ] ページが実際にブラウザに読み込まれた（想定ではなく）
- [ ] 変更されたコンポーネントが確認された（スクリーンショット）**かつ** console/page エラーがない（`browser_observe`）
- [ ] 自身のオリジンからのネットワーク失敗がない
- [ ] レイアウト/レスポンシブが対象だった場合：関連する viewport にわたる `browser_audit` で確認済みの崩れがない

## セキュリティに関する注意

MCP はデフォルトでプライベート/ローカルアドレスをブロックする（サブリソースを含む）。**ローカル dev server** を検証するには、信頼できる環境で `BROWSER_OBSERVER_BLOCK_PRIVATE_IPS=false` を設定して起動する必要がある — そうでなければ `localhost`/RFC1918 へのナビゲートは設計上ブロックされる。

## ツールリファレンス

すべてのツールは `mcp-browser-observer` MCP によって公開される（完全修飾名は `mcp__mcp-browser-observer__<tool>`）：

- **観察（専門）:** `browser_observe`, `browser_audit`, `browser_screenshot`
- **操作:** `browser_navigate`, `browser_click`, `browser_type`, `browser_press_key`, `browser_scroll`, `browser_wait`
- **検査:** `browser_extract`, `browser_evaluate`
- **セッション/出力:** `browser_reset`, `browser_clear_telemetry`, `browser_pdf`

（`browser_press_key` は実際の keydown/keyup をディスパッチする — キーボード駆動の UI に使用；`browser_type` は input の値を設定するだけ。）

## まとめ

MCP はあなたに目を与える；このスキルはどこを見るかを決める。最も軽い観察から始め、シグナルがあった時だけエスカレートし、候補を判断力をもって解釈し、実際に観察することなく UI が完成したと宣言しない。
