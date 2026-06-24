# 新規参画者向け キャッチアップ読書順

このドキュメントは、「どこから読むと最短で全体像を掴めるか」を示す実践ガイドです。  
対象は主にバックエンド（フェーズ1〜6）です。

---

## 0. 最初の10分で把握するもの（地図作り）

1. `docs/SPEC.md`
2. `docs/IMPLEMENTATION.md`
3. `backend/app/main.py`

### ここで理解すること

- アプリの目的（英会話 → フィードバック → 保存/復習）
- APIの大枠（認証、セッション、会話SSE、フィードバック、保存）
- どのルーターが現在有効か

> まず地図を作ってから詳細に入ると、個別ファイルの意図を見失いにくくなります。

---

## 1. インフラ基盤（依存の根）を読む

1. `backend/app/config.py`
2. `backend/app/database.py`
3. `backend/app/logging_config.py`
4. `backend/app/context.py`
5. `backend/app/middleware/request_id.py`
6. `backend/app/middleware/login_rate_limit.py`
7. `backend/app/handlers/errors.py`

### ここで理解すること

- 環境変数の契約（必須値・デフォルト値）
- DB接続（SQLAlchemy + asyncpg の役割分担）
- ログと `request_id` の流れ
- 例外がどの形式でクライアントに返るか
- セキュリティ対策（ログインレート制限）

> この層を先に理解すると、後続のルーター実装を「なぜこの書き方か」で読めます。

---

## 2. 認証まわり（全APIの入口）を読む

1. `backend/app/models/base.py`
2. `backend/app/models/user.py`
3. `backend/app/auth/schemas.py`
4. `backend/app/auth/db.py`
5. `backend/app/auth/manager.py`
6. `backend/app/auth/backend.py`
7. `backend/app/auth/users.py`
8. `backend/app/auth/deps.py`

### ここで理解すること

- FastAPI Users の構成要素
- JWT戦略の設定
- パスワードポリシー
- `Depends(get_current_user_id)` が業務APIの認可基盤であること

> 以降のルーターは認証依存で成り立つため、このブロックを先に押さえるのが効率的です。

---

## 3. セッション軸（ドメインの中心）を読む

1. `backend/app/schemas/sessions.py`
2. `backend/app/repositories/sessions.py`
3. `backend/app/routers/sessions.py`

### ここで理解すること

- `conversation_sessions` の状態遷移（`active` → `completed`）
- 所有権チェック（他ユーザーは403）
- ページング（`limit` / `offset`）
- dataclassベースの型安全なデータ受け渡し

> 会話・フィードバック・保存はすべてセッションにぶら下がるため、ここが中核です。

---

## 4. 会話SSE（リアルタイム処理）を読む

1. `backend/app/schemas/messages.py`
2. `backend/app/repositories/messages.py`
3. `backend/app/prompts/conversation.txt`
4. `backend/app/services/openai_service.py`
5. `backend/app/routers/messages.py`

### ここで理解すること

- SSEイベント設計（`chunk` / `done` / `error`）
- 先に user 発話を保存する理由（整合性維持）
- OpenAIストリーム処理と履歴の扱い
- `SESSION_NOT_ACTIVE` など状態制御

> 複雑性が高い層なので、repository → service → router の順で読むと追いやすいです。

---

## 5. フィードバック生成を読む

1. `backend/app/schemas/feedback.py`
2. `backend/app/prompts/feedback.txt`
3. `backend/app/services/feedback_service.py`
4. `backend/app/routers/feedback.py`

### ここで理解すること

- `completed` セッションのみ対象にする理由
- OpenAI `json_object` で型を固定している理由
- 4分類（grammar / vocabulary / naturalness / pronunciation）

---

## 6. 保存・復習APIを読む

1. `backend/app/schemas/saved_items.py`
2. `backend/app/repositories/saved_items.py`
3. `backend/app/routers/saved_items.py`

### ここで理解すること

- フィードバックのうち「手動選択のみ保存」する設計
- `user_id` スコープでのCRUD
- 復習一覧の取得・削除の流れ

---

## 7. 最後に必ず見る（運用・変更履歴）

1. `docs/REFACTOR_20260623.md`
2. `.env.example`

### ここで理解すること

- セキュリティ/可読性/性能の改善理由
- 追加済み環境変数
- 現在の設計意図（「なぜそう実装したか」）

---

## 最短キャッチアップの目安

- ざっくり把握: 45〜60分  
- 実装に手を入れられるレベル: 2〜3時間  
- SSE/OpenAIまで深く理解: 半日

---

## 読むときのコツ

- **横読みしない**: まず1機能を「schema → repository → service → router」で縦に追う
- **状態遷移をメモる**: `active/completed` などの前提条件を先に整理する
- **例外コードを起点に追う**: `AppError` の code から逆引きすると仕様理解が早い

