# English Conversation Practice App — 技術仕様書

> 実装時の参照用ドキュメント。本書に記載の決定事項は変更時に本ファイルを更新する。

---

## 1. プロジェクト概要

ユーザーが自然言語で状況（シナリオ）を設定し、AI と英会話を行う Web アプリ。
会話終了後に AI が文法・語彙・自然さ・発音（テキスト化後）の誤りをまとめて指摘する。
ユーザーは誤りや理解できなかった表現を手動で保存し、後から一覧で復習できる。

---

## 2. 技術スタック

### 2.1 確定済み構成

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React + Vite + TypeScript |
| ルーティング | React Router |
| 状態管理 | useState + Zustand |
| HTTP クライアント | axios |
| UI | Tailwind CSS + shadcn/ui |
| 型生成 | OpenAPI スキーマから TypeScript 型を自動生成 |
| バックエンド | FastAPI + Python 3.12+ |
| 認証 | FastAPI Users（JWT 戦略） |
| DB | Neon（PostgreSQL） |
| DB アクセス | 業務データ: 生 SQL（asyncpg）/ 認証: SQLAlchemy（FastAPI Users 要件） |
| マイグレーション | Alembic |
| AI | OpenAI Chat Completions API |
| コンテナ | Docker / Docker Compose |
| リポジトリ構成 | モノレポ |
| デプロイ（FE） | Cloudflare Pages |
| デプロイ（BE） | Railway |
| デプロイ（DB） | Neon |

### 2.2 使用モデル

| 用途 | モデル |
|------|--------|
| 会話（相手役） | `gpt-4o-mini` |
| 会話後フィードバック | `gpt-4o-mini` |

コスト優先。品質不足が確認された場合のみモデル変更を検討する。

### 2.3 意図的に後回しとする項目

以下は本仕様の対象外とし、実装時に考慮しない。

- 画面デザインの詳細（ワイヤーフレーム以上のビジュアル仕様）
- 間隔反復（SRS）による復習
- 課金・プラン制限
- UI の多言語対応
- 管理者画面
- テスト戦略の詳細
- CI/CD パイプライン
- Sentry 等の外部監視サービス

---

## 3. アーキテクチャ

```
┌─────────────────────┐
│  Cloudflare Pages   │  React (Vite build)
│  app.example.com    │
└──────────┬──────────┘
           │ HTTPS (REST / SSE)
           ▼
┌─────────────────────┐
│  Railway            │  FastAPI (Docker)
│  api.example.com    │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌──────────────┐
│  Neon   │  │  OpenAI API  │
│  (PG)   │  │  gpt-4o-mini │
└─────────┘  └──────────────┘
```

### 3.1 通信方式

| 方式 | 用途 |
|------|------|
| REST（JSON） | 認証、セッション CRUD、メッセージ送信、誤り保存、復習一覧 |
| SSE | AI 会話中のストリーミング応答（相手役ロール） |

WebSocket は使用しない。

### 3.2 音声入力

| 項目 | 方針 |
|------|------|
| 音声 → テキスト | ブラウザ Web Speech API（フロントエンドのみ） |
| 音声ファイル保存 | しない |
| 発音評価 | テキスト化された発話を ChatGPT が会話後フィードバックで評価 |

---

## 4. 認証

### 4.1 ライブラリ

**FastAPI Users** を使用する（FastAPI エコシステムの標準的なユーザー管理ライブラリ）。

- 認証戦略: **JWT（Bearer トークン）**
- トークン送信: `Authorization: Bearer <token>` ヘッダー
- パスワードハッシュ: FastAPI Users デフォルト（bcrypt）

### 4.2 認証と DB アクセスの役割分担

FastAPI Users は SQLAlchemy を要求するため、以下のように分離する。

| ドメイン | アクセス方法 |
|----------|-------------|
| ユーザー・認証テーブル（`user` 等） | SQLAlchemy（FastAPI Users 管理） |
| 業務テーブル（会話・メッセージ・誤り等） | 生 SQL（asyncpg） |

両者は同一 Neon データベースを共有する。

### 4.3 認証フロー

1. `POST /auth/register` — ユーザー登録（メール + パスワード）
2. `POST /auth/jwt/login` — ログイン → JWT 取得
3. `POST /auth/jwt/logout` — ログアウト（トークン無効化は実装しない。クライアント側でトークン削除）
4. 以降の API は JWT 必須（認証エンドポイントを除く）

> MVP 方針: メール検証（verification email）は未実装。  
> 本番でメール検証を必須にする場合は、SMTP/外部メール送信基盤を導入したうえで FastAPI Users の verify フローを有効化する。

### 4.4 認可

- 全業務データは `user_id` でスコープする
- API は必ず JWT から `user_id` を取得し、他ユーザーのデータへのアクセスを拒否する（403）

---

## 5. AI 会話・フィードバック仕様

### 5.1 会話フロー

```
1. ユーザーが状況（シナリオ）を自然言語で入力
2. セッション作成（scenario_text を保存）
3. 会話中: AI は「会話相手」ロールのみ
   - ユーザー発話（Web Speech API → テキスト）を POST
   - AI 応答を SSE でストリーミング返却
   - 双方のメッセージを DB に保存
4. ユーザーが会話終了を明示
5. AI が「先生」ロールで会話後フィードバックを生成（REST、一括返却）
6. フィードバック結果を表示。ユーザーが誤りを手動選択して保存
```

### 5.2 AI ロール

| フェーズ | ロール | 通信 |
|----------|--------|------|
| 会話中 | 会話相手（相手役） | SSE ストリーミング |
| 会話後 | 英語教師（指摘役） | REST 一括応答 |

### 5.3 会話後フィードバックの指摘対象

以下すべてを対象とする。

- **文法**（grammar）
- **語彙**（vocabulary）
- **自然さ**（naturalness）
- **発音**（pronunciation）— テキスト化された発話に基づく間接的評価

### 5.4 フィードバック出力形式（AI → バックエンド）

バックエンドは OpenAI の `response_format: json_object` を使用し、以下の構造でパースする。

```json
{
  "items": [
    {
      "type": "grammar",
      "original": "ユーザーが話した（または書いた）文",
      "corrected": "修正後の文",
      "explanation": "日本語での説明"
    }
  ]
}
```

`type` は `grammar` | `vocabulary` | `naturalness` | `pronunciation` のいずれか。

### 5.5 誤りの保存

- フィードバック結果からユーザーが**手動で選択**した項目のみ `saved_items` テーブルに保存する
- 自動保存はしない

### 5.6 プロンプト管理

- システムプロンプトはバックエンドの `app/prompts/` ディレクトリにテンプレートファイルとして配置
- 会話用・フィードバック用で別ファイルを用意する

---

## 6. データモデル

### 6.1 ER 概要

```
users (FastAPI Users 管理)
  │
  ├──< conversation_sessions
  │       │
  │       └──< messages
  │
  └──< saved_items
```

### 6.2 テーブル定義

#### `conversation_sessions`

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | セッション ID |
| user_id | UUID FK → user.id | 所有者 |
| scenario_text | TEXT NOT NULL | ユーザーが設定した状況 |
| status | VARCHAR(20) NOT NULL | `active` / `completed` |
| created_at | TIMESTAMPTZ NOT NULL | 作成日時 |
| completed_at | TIMESTAMPTZ | 会話終了日時 |

**ルール:** 1 状況設定 = 1 セッション。

#### `messages`

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | メッセージ ID |
| session_id | UUID FK → conversation_sessions.id | 所属セッション |
| role | VARCHAR(20) NOT NULL | `user` / `assistant` |
| content | TEXT NOT NULL | 発話テキスト |
| created_at | TIMESTAMPTZ NOT NULL | 送信日時 |

ユーザーの音声ファイルは保存しない。テキストのみ保存する。

#### `saved_items`

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | 保存項目 ID |
| user_id | UUID FK → user.id | 所有者 |
| session_id | UUID FK → conversation_sessions.id | 元セッション（参照用） |
| type | VARCHAR(20) NOT NULL | `grammar` / `vocabulary` / `naturalness` / `pronunciation` |
| original | TEXT NOT NULL | 元の文・表現 |
| corrected | TEXT NOT NULL | 修正後 |
| explanation | TEXT NOT NULL | 説明 |
| created_at | TIMESTAMPTZ NOT NULL | 保存日時 |

#### `user`（FastAPI Users 管理）

FastAPI Users のデフォルトスキーマに従う。Alembic + SQLAlchemy で管理。

### 6.3 インデックス

```sql
CREATE INDEX idx_sessions_user_id_created_at ON conversation_sessions (user_id, created_at DESC);
CREATE INDEX idx_messages_session_id_created_at ON messages (session_id, created_at ASC);
CREATE INDEX idx_saved_items_user_id_created_at ON saved_items (user_id, created_at DESC);
```

---

## 7. API 設計

### 7.1 エンドポイント一覧

#### 認証（FastAPI Users 提供）

| Method | Path | 説明 |
|--------|------|------|
| POST | `/auth/register` | ユーザー登録 |
| POST | `/auth/jwt/login` | ログイン |
| POST | `/auth/jwt/logout` | ログアウト |
| GET | `/users/me` | 現在のユーザー情報 |

#### セッション

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/sessions` | セッション作成（scenario_text） |
| GET | `/api/sessions` | セッション一覧 |
| GET | `/api/sessions/{id}` | セッション詳細 + メッセージ一覧 |
| POST | `/api/sessions/{id}/complete` | 会話終了 |

#### 会話

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/sessions/{id}/messages` | ユーザーメッセージ送信 → SSE ストリームで AI 応答 |
| POST | `/api/sessions/{id}/feedback` | 会話後フィードバック生成（一括 JSON 返却） |

#### 保存・復習

| Method | Path | 説明 |
|--------|------|------|
| POST | `/api/saved-items` | 誤り・表現を手動保存 |
| GET | `/api/saved-items` | 保存一覧（復習用） |
| DELETE | `/api/saved-items/{id}` | 保存項目削除 |

#### その他

| Method | Path | 説明 |
|--------|------|------|
| GET | `/health` | ヘルスチェック |
| GET | `/openapi.json` | OpenAPI スキーマ（型生成用） |

### 7.2 SSE 仕様（メッセージ送信）

`POST /api/sessions/{id}/messages`

**リクエスト:**
```json
{ "content": "ユーザーの発話テキスト" }
```

**レスポンス:** `Content-Type: text/event-stream`

```
event: chunk
data: {"content": "部分テキスト"}

event: done
data: {"message_id": "uuid"}
```

- `chunk` イベント: AI 応答のトークン単位ストリーミング
- `done` イベント: 完了。assistant メッセージの ID を返す

### 7.3 エラーレスポンス形式

全 API で統一する。

```json
{
  "error": {
    "code": "SESSION_NOT_FOUND",
    "message": "人間が読めるエラーメッセージ"
  }
}
```

| HTTP Status | 用途 |
|-------------|------|
| 400 | バリデーションエラー |
| 401 | 未認証 |
| 403 | 他ユーザーのリソースへのアクセス |
| 404 | リソース不存在 |
| 500 | サーバー内部エラー |

---

## 8. フロントエンド仕様

### 8.1 ページ構成

| パス | ページ | 認証 |
|------|--------|------|
| `/` | ランディングページ | 不要 |
| `/login` | ログイン | 不要 |
| `/register` | 登録 | 不要 |
| `/dashboard` | ダッシュボード（セッション一覧） | 必須 |
| `/sessions/new` | 新規セッション作成（状況設定） | 必須 |
| `/sessions/:id` | 会話画面 | 必須 |
| `/sessions/:id/feedback` | 会話後フィードバック | 必須 |
| `/review` | 復習一覧 | 必須 |

- ログイン成功後は `/dashboard` にリダイレクトする
- 未認証ユーザーが認証必須ページにアクセスした場合は `/login` にリダイレクトする

### 8.2 状態管理

| ライブラリ | 用途 |
|------------|------|
| useState | コンポーネントローカルな UI 状態 |
| Zustand | 認証トークン、現在のセッション、会話メッセージ一覧 |

### 8.3 OpenAPI 型生成

- バックエンドの `/openapi.json` から `openapi-typescript` で型を生成
- 生成先: `frontend/src/types/api.generated.ts`
- スクリプト: `frontend/package.json` の `generate:api` コマンド
- バックエンド API 変更後は型を再生成する

```bash
# frontend/
npm run generate:api
# 内部で openapi-typescript http://localhost:8000/openapi.json -o src/types/api.generated.ts
```

### 8.4 音声入力

- Web Speech API（`webkitSpeechRecognition` / `SpeechRecognition`）を使用
- 対応ブラウザ: Chrome / Edge（Safari 非対応の場合はテキスト入力フォールバックを表示）
- 認識結果をテキスト入力欄に反映し、ユーザーが確認・編集後に送信

---

## 9. モノレポ構成

```
english-project/
├── docker-compose.yml
├── .env.example
├── .gitignore
├── docs/
│   └── SPEC.md                 # 本ファイル
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml          # または requirements.txt
│   ├── alembic/
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   └── versions/
│   │       └── 20250620_000001_initial_schema.py
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py         # asyncpg プール + SQLAlchemy エンジン
│       ├── auth/               # FastAPI Users 設定
│       ├── models/             # SQLAlchemy モデル（user のみ）
│       ├── repositories/       # 生 SQL クエリ
│       ├── routers/
│       │   ├── sessions.py
│       │   ├── messages.py
│       │   ├── feedback.py
│       │   └── saved_items.py
│       ├── services/
│       │   ├── openai_service.py
│       │   └── feedback_service.py
│       └── prompts/
│           ├── conversation.txt
│           └── feedback.txt
└── frontend/
    ├── Dockerfile              # 開発用（本番は Cloudflare Pages がビルド）
    ├── package.json
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── App.tsx
        ├── types/
        │   └── api.generated.ts
        ├── stores/             # Zustand
        ├── pages/
        ├── components/
        └── lib/
            ├── api.ts          # axios インスタンス
            └── auth.ts
```

---

## 10. Docker

### 10.1 用途

| 対象 | 方針 |
|------|------|
| FastAPI | Docker コンテナで実行 |
| React（開発） | Docker Compose で起動可能にする |
| PostgreSQL | **使用しない**（Neon を使用） |
| 本番 FE | Cloudflare Pages がビルド・ホスティング |

### 10.2 docker-compose.yml（開発用）

```yaml
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    env_file:
      - .env
    volumes:
      - ./backend:/app
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    command: npm run dev -- --host
```

---

## 11. 環境変数

### 11.1 一覧

| 変数名 | 用途 | 設定場所 |
|--------|------|----------|
| `DATABASE_URL` | Neon 接続文字列（SQLAlchemy 用、`postgresql+asyncpg://...`） | BE |
| `DATABASE_URL_RAW` | Neon 接続文字列（asyncpg 用、`postgresql://...`） | BE |
| `OPENAI_API_KEY` | OpenAI API キー | BE |
| `OPENAI_MODEL` | OpenAI モデル名 | BE |
| `JWT_SECRET` | JWT 署名用秘密鍵 | BE |
| `JWT_LIFETIME_SECONDS` | JWT 有効期限（秒）。デフォルト: `3600` | BE |
| `CORS_ORIGINS` | 許可オリジン（カンマ区切り） | BE |
| `TRUST_X_FORWARDED_FOR` | XFF ヘッダーを信頼するか（既定: `false`） | BE |
| `SQLALCHEMY_POOL_SIZE` | SQLAlchemy プールサイズ | BE |
| `SQLALCHEMY_MAX_OVERFLOW` | SQLAlchemy 追加接続上限 | BE |
| `ASYNCPG_POOL_MIN_SIZE` | asyncpg プール最小接続数 | BE |
| `ASYNCPG_POOL_MAX_SIZE` | asyncpg プール最大接続数 | BE |
| `LOGIN_RATE_LIMIT_WINDOW_SECONDS` | ログイン制限の窓秒数 | BE |
| `LOGIN_RATE_LIMIT_MAX_ATTEMPTS` | ログイン制限回数 | BE |
| `REGISTER_RATE_LIMIT_WINDOW_SECONDS` | 登録制限の窓秒数 | BE |
| `REGISTER_RATE_LIMIT_MAX_ATTEMPTS` | 登録制限回数 | BE |
| `OPENAI_MESSAGE_RATE_LIMIT_PER_MINUTE` | 会話 API の分間上限 | BE |
| `OPENAI_MESSAGE_RATE_LIMIT_PER_DAY` | 会話 API の日次上限 | BE |
| `OPENAI_FEEDBACK_RATE_LIMIT_PER_MINUTE` | フィードバック API の分間上限 | BE |
| `OPENAI_FEEDBACK_RATE_LIMIT_PER_DAY` | フィードバック API の日次上限 | BE |
| `SCENARIO_TEXT_MAX_LENGTH` | シナリオ文字数上限 | BE |
| `FEEDBACK_MESSAGE_MAX_COUNT` | フィードバック生成対象の最大メッセージ件数 | BE |
| `VITE_API_BASE_URL` | バックエンド API の URL | FE |

### 11.2 Git 管理のベストプラクティス

```
english-project/
├── .env.example        # 変数名とダミー値のみ。Git 管理する
├── .env                # 実際の値。Git 管理しない
└── .gitignore          # .env を除外
```

**ルール:**

- `.env.example` に全変数を記載し、値はプレースホルダー（`your-secret-here` 等）とする
- `.env` は `.gitignore` に追加し、絶対にコミットしない
- 本番の秘密情報は各ホスティングのシークレット機能で設定する
  - Railway: Environment Variables
  - Cloudflare Pages: Environment Variables
  - Neon: ダッシュボードの接続文字列をコピー

### 11.3 本番環境の設定例

**Railway（バックエンド）:**
```
DATABASE_URL=postgresql+asyncpg://...@...neon.tech/neondb?sslmode=require
DATABASE_URL_RAW=postgresql://...@...neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-...
JWT_SECRET=<ランダムな64文字以上の文字列>
JWT_LIFETIME_SECONDS=3600
CORS_ORIGINS=https://app.example.com
```

**Cloudflare Pages（フロントエンド）:**
```
VITE_API_BASE_URL=https://api.example.com
```

---

## 12. DB マイグレーション（Alembic）

### 12.1 方針

- Alembic で全テーブルのマイグレーションを管理する
- FastAPI Users の `user` テーブルは SQLAlchemy モデルから autogenerate
- 業務テーブル（`conversation_sessions`, `messages`, `saved_items`）はマイグレーションファイル内に生 SQL で記述

### 12.2 ファイル命名規則

```
YYYYMMDD_HHMMSS_<説明>.py
```

例:
```
20250620_000001_create_user_table.py
20250620_000002_create_conversation_tables.py
20250620_000003_add_indexes.py
```

- 日付 + 連番で時系列順を保証
- 説明は snake_case、動詞で始める（`create_`, `add_`, `alter_`, `drop_`）

### 12.3 マイグレーションファイルの書き方（業務テーブル）

```python
def upgrade() -> None:
    op.execute("""
        CREATE TABLE conversation_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
            scenario_text TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            completed_at TIMESTAMPTZ
        );
    """)

def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS conversation_sessions;")
```

### 12.4 本番適用手順

1. ローカルでマイグレーションを作成・テスト
   ```bash
   cd backend
   alembic revision --autogenerate -m "create_user_table"  # user テーブル
   alembic revision -m "create_conversation_tables"         # 手動 SQL
   alembic upgrade head
   ```
2. PR にマイグレーションファイルを含めてマージ
3. 本番デプロイ前に Neon の SQL Editor または Railway のコンソールから手動適用
   ```bash
   alembic upgrade head
   ```
4. 適用後、アプリをデプロイ

**注意:** マイグレーションはアプリデプロイより**先に**適用する。ダウンタイムを避けるため、カラム追加はデフォルト値付きで行い、削除は次回リリースで行う。

---

## 13. ログ・デバッグ

### 13.1 方針

Sentry は使用しない。デバッグに必要な最低限のログを標準出力に出力する。

### 13.2 ログ形式

構造化 JSON（Python `logging` + JSON formatter）。

```json
{
  "timestamp": "2025-06-20T12:00:00Z",
  "level": "ERROR",
  "message": "OpenAI API call failed",
  "request_id": "uuid",
  "user_id": "uuid",
  "endpoint": "POST /api/sessions/xxx/messages",
  "error": "RateLimitError: ..."
}
```

### 13.3 ログレベル

| レベル | 用途 |
|--------|------|
| INFO | リクエスト開始・終了、セッション作成・完了 |
| WARNING | リトライ、フォールバック |
| ERROR | API 失敗、DB エラー、予期しない例外 |
| DEBUG | 開発環境のみ。OpenAI リクエスト/レスポンスの概要 |

### 13.4 リクエスト ID

- 全リクエストに `X-Request-ID` ヘッダー（なければサーバーで UUID 生成）
- ログ・エラーレスポンスに含め、問題追跡に使用

---

## 14. セキュリティ

| 項目 | 方針 |
|------|------|
| OpenAI API キー | バックエンドのみ。フロントに露出しない |
| CORS | `CORS_ORIGINS` で Cloudflare Pages のドメインのみ許可 |
| HTTPS | 本番は全通信 HTTPS（Cloudflare / Railway が提供） |
| SQL インジェクション | パラメータバインド（`$1`, `$2`）を必ず使用 |
| 認可 | 全クエリに `user_id` フィルタを適用 |
| 認証トークン保管 | Bearer JWT をクライアント側ストレージで保持（MVP）。XSS 対策として短めの有効期限・CSP 導入を推奨 |

---

## 15. デプロイ

### 15.1 バックエンド（Railway）

- `backend/Dockerfile` からビルド
- 環境変数を Railway ダッシュボードで設定
- デプロイコマンド: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

### 15.2 フロントエンド（Cloudflare Pages）

- ビルドコマンド: `cd frontend && npm run build`
- 出力ディレクトリ: `frontend/dist`
- 環境変数: `VITE_API_BASE_URL`
- SPA ルーティング: `_redirects` または Cloudflare Pages の SPA 設定で全パスを `index.html` にフォールバック
- `frontend/Dockerfile` はローカル開発専用。フロント本番配信には使用しない

### 15.3 DB（Neon）

- プロジェクト作成時に PostgreSQL バージョン 16 を選択
- 接続には SSL 必須（`?sslmode=require`）

---

## 16. 実装順序（推奨）

詳細なフェーズ分け・完了条件・依存関係は [IMPLEMENTATION.md](./IMPLEMENTATION.md) を参照。

1. モノレポ初期構成 + Docker Compose ✅
2. バックエンド骨格（FastAPI + ヘルスチェック） ✅
3. DB 接続 + Alembic 初期マイグレーション
4. FastAPI Users 認証
5. セッション CRUD API
6. メッセージ送信 + SSE ストリーミング（OpenAI 連携）
7. 会話後フィードバック API
8. 保存・復習 API
9. フロントエンド骨格（Vite + Router + 認証画面）
10. 会話画面（Web Speech API 含む）
11. フィードバック・復習画面
12. OpenAPI 型生成の組み込み
13. 本番デプロイ

---

## 変更履歴

| 日付 | 内容 |
|------|------|
| 2025-06-20 | 初版作成 |
| 2025-06-20 | `/` をランディングページ、ダッシュボードを `/dashboard` に変更 |
| 2025-06-21 | 実装順序の詳細を IMPLEMENTATION.md に分離 |
