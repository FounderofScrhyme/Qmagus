# 環境変数テンプレート（開発・本番）

> マイグレーション `20260625_000004` 適用後の設定例。  
> 実際の秘密情報は `.env`（Git 管理外）に置き、本番は各ホスティングのシークレット機能を使う。

---

## 1. ローカル開発（`docker compose up`）

プロジェクトルートの `.env` に以下を設定する。

```env
# ===== 必須（自分の値に置き換える） =====
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
DATABASE_URL_RAW=postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
JWT_SECRET=8f3a5c7e9d1b2a4f6c8e0a2d4f6b8c0e2a4d6f8b0c2e4a6d8f0b2c4e6a8d0f2b4c6e8a0d2f4b6c8e0a2d4f6b8c0e2a4d6f8b0c2e4

# ===== フロント（docker-compose で上書きされるが明示推奨） =====
VITE_API_BASE_URL=http://localhost:8000
CORS_ORIGINS=http://localhost:5173

# ===== OpenAI =====
OPENAI_MODEL=gpt-4o-mini

# ===== 認証 =====
JWT_LIFETIME_SECONDS=3600
PASSWORD_MIN_LENGTH=8

# ===== レート制限（認証） =====
LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=10
REGISTER_RATE_LIMIT_WINDOW_SECONDS=300
REGISTER_RATE_LIMIT_MAX_ATTEMPTS=10

# ===== レート制限（OpenAI コスト制御） =====
OPENAI_MESSAGE_RATE_LIMIT_PER_MINUTE=20
OPENAI_MESSAGE_RATE_LIMIT_PER_DAY=200
OPENAI_FEEDBACK_RATE_LIMIT_PER_MINUTE=10
OPENAI_FEEDBACK_RATE_LIMIT_PER_DAY=50

# ===== 入力・取得上限 =====
SCENARIO_TEXT_MAX_LENGTH=2000
FEEDBACK_MESSAGE_MAX_COUNT=100
SESSION_LIST_DEFAULT_LIMIT=20
SESSION_LIST_MAX_LIMIT=100
MESSAGE_LIST_DEFAULT_LIMIT=50
MESSAGE_LIST_MAX_LIMIT=200
SAVED_ITEM_LIST_DEFAULT_LIMIT=50
SAVED_ITEM_LIST_MAX_LIMIT=200

# ===== DB プール（Neon 接続数に合わせて調整） =====
SQLALCHEMY_POOL_SIZE=5
SQLALCHEMY_MAX_OVERFLOW=5
ASYNCPG_POOL_MIN_SIZE=1
ASYNCPG_POOL_MAX_SIZE=10

# ===== プロキシ設定 =====
# ローカルでは false。Railway 等の信頼プロキシ配下でのみ true
TRUST_X_FORWARDED_FOR=false
```

### 必須チェックリスト

- [ ] `DATABASE_URL` / `DATABASE_URL_RAW` が Neon の実接続文字列
- [ ] `OPENAI_API_KEY` が有効（会話・フィードバックに必須）
- [ ] `JWT_SECRET` が **64文字以上**（プレースホルダー不可）
- [ ] `alembic upgrade head` 済み（現在: `20260625_000004`）

---

## 2. 本番（Railway バックエンド）

```env
DATABASE_URL=postgresql+asyncpg://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
DATABASE_URL_RAW=postgresql://<user>:<password>@<host>.neon.tech/neondb?sslmode=require
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=<64文字以上のランダム文字列>
JWT_LIFETIME_SECONDS=3600
CORS_ORIGINS=https://<your-app>.pages.dev
TRUST_X_FORWARDED_FOR=true

SQLALCHEMY_POOL_SIZE=5
SQLALCHEMY_MAX_OVERFLOW=5
ASYNCPG_POOL_MIN_SIZE=1
ASYNCPG_POOL_MAX_SIZE=10

LOGIN_RATE_LIMIT_WINDOW_SECONDS=60
LOGIN_RATE_LIMIT_MAX_ATTEMPTS=10
REGISTER_RATE_LIMIT_WINDOW_SECONDS=300
REGISTER_RATE_LIMIT_MAX_ATTEMPTS=10

OPENAI_MESSAGE_RATE_LIMIT_PER_MINUTE=20
OPENAI_MESSAGE_RATE_LIMIT_PER_DAY=200
OPENAI_FEEDBACK_RATE_LIMIT_PER_MINUTE=10
OPENAI_FEEDBACK_RATE_LIMIT_PER_DAY=50

SCENARIO_TEXT_MAX_LENGTH=2000
FEEDBACK_MESSAGE_MAX_COUNT=100
PASSWORD_MIN_LENGTH=8
SESSION_LIST_DEFAULT_LIMIT=20
SESSION_LIST_MAX_LIMIT=100
MESSAGE_LIST_DEFAULT_LIMIT=50
MESSAGE_LIST_MAX_LIMIT=200
SAVED_ITEM_LIST_DEFAULT_LIMIT=50
SAVED_ITEM_LIST_MAX_LIMIT=200
```

Railway デプロイコマンド例:

```bash
alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

---

## 3. 本番（Cloudflare Pages フロントエンド）

```env
VITE_API_BASE_URL=https://<your-api>.up.railway.app
```

---

## 4. 起動・確認手順

```bash
# 1) マイグレーション（初回 or 更新時）
cd backend
source .venv/bin/activate
alembic upgrade head

# 2) 起動
cd ..
docker compose up --build
```

| 確認項目 | URL |
|---------|-----|
| ヘルスチェック | http://localhost:8000/health |
| フロント | http://localhost:5173 |

### 動作確認フロー

1. 新規登録（パスワード: 8文字以上 + 英字と数字）
2. シナリオ入力 → 会話送信（OpenAI 応答がストリーミング表示）
3. 会話終了 → フィードバック表示
4. 項目保存 → 復習一覧で確認

---

## 5. 値の調整ガイド

| 変数 | 上げると | 下げると |
|------|---------|---------|
| `OPENAI_*_RATE_LIMIT_*` | ユーザー体験向上 | コスト・負荷増加を抑制 |
| `ASYNCPG_POOL_MAX_SIZE` | DB 同時処理能力向上 | Neon 接続数消費を抑制 |
| `SCENARIO_TEXT_MAX_LENGTH` | 長いシナリオ入力を許可 | トークン・DB 負荷を抑制 |
| `FEEDBACK_MESSAGE_MAX_COUNT` | 長会話の添削精度向上 | OpenAI 入力コストを抑制 |

---

## 関連ドキュメント

- [PREDEPLOY_REFACTOR_GUIDELINES_20260625.md](./PREDEPLOY_REFACTOR_GUIDELINES_20260625.md)
- [SETUP.md](./SETUP.md)
- [SPEC.md](./SPEC.md)（11. 環境変数）
