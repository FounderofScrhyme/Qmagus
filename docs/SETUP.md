# 開発環境セットアップ手順

> 対象 OS: macOS  
> 本プロジェクトの開発に必要な Python / Node.js / Docker のインストールから、フレームワーク・ライブラリの導入までを順番に説明する。

---

## 目次

1. [Homebrew のインストール](#1-homebrew-のインストール)
2. [Python のインストール](#2-python-のインストール)
3. [Node.js のインストール](#3-nodejs-のインストール)
4. [Docker のインストール](#4-docker-のインストール)
5. [プロジェクトの依存関係インストール](#5-プロジェクトの依存関係インストール)
6. [動作確認](#6-動作確認)
7. [よくあるトラブル](#7-よくあるトラブル)

---

## 1. Homebrew のインストール

macOS で開発ツールを入れるためのパッケージマネージャー。以降の手順で使用する。

### インストール

ターミナルを開き、以下を実行する。

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

インストール完了後、画面に表示される **Next steps** のコマンドを実行する（Apple Silicon Mac の場合の例）。

```bash
echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

### 確認

```bash
brew --version
```

バージョンが表示されれば OK。

---

## 2. Python のインストール

本プロジェクトは **Python 3.12 以上** を使用する（仕様書参照）。

### インストール

```bash
brew install python@3.12
```

PATH に追加する（Apple Silicon Mac の場合）。

```bash
echo 'export PATH="/opt/homebrew/opt/python@3.12/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

Intel Mac の場合は `/usr/local/opt/python@3.12/bin` になることがある。`brew info python@3.12` で確認する。

### 確認

```bash
python3 --version
# Python 3.12.x と表示されれば OK

pip3 --version
```

### 補足: conda / Anaconda を使っている場合

ターミナルに `(base)` と表示されている場合、Anaconda が入っている可能性がある。本プロジェクトでは **venv（仮想環境）** を使うため、Anaconda ベースの Python ではなく、上記 `brew install` で入れた Python 3.12 を使うことを推奨する。

```bash
which python3
# /opt/homebrew/opt/python@3.12/bin/python3 のようなパスが望ましい
```

---

## 3. Node.js のインストール

本プロジェクトのフロントエンドは **Node.js 20 以上** を推奨する。

### 方法 A: Homebrew でインストール（シンプル）

```bash
brew install node@20
echo 'export PATH="/opt/homebrew/opt/node@20/bin:$PATH"' >> ~/.zprofile
source ~/.zprofile
```

### 方法 B: nvm でインストール（バージョン管理しやすい）

複数プロジェクトで Node バージョンを切り替えたい場合はこちら。

```bash
brew install nvm
mkdir -p ~/.nvm
```

`~/.zprofile` に以下を追加する。

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && \. "/opt/homebrew/opt/nvm/nvm.sh"
```

反映後、Node.js 20 をインストールする。

```bash
source ~/.zprofile
nvm install 20
nvm use 20
nvm alias default 20
```

### 確認

```bash
node --version
# v20.x.x と表示されれば OK

npm --version
```

---

## 4. Docker のインストール

本プロジェクトでは開発環境の統一のために Docker を使用する（仕様書参照）。DB は Neon（クラウド）を使うため、**PostgreSQL 用のコンテナは不要**。

### インストール

1. [Docker Desktop for Mac](https://www.docker.com/products/docker-desktop/) にアクセス
2. **Download for Mac** をクリック
  - Apple Silicon（M1/M2/M3/M4）: **Apple Chip**
  - Intel Mac: **Intel Chip**
3. ダウンロードした `.dmg` を開き、Docker アイコンを Applications にドラッグ
4. Applications から **Docker** を起動
5. 初回起動時の利用規約に同意し、権限の許可を求められたら許可する
6. メニューバーにクジラのアイコンが表示され、「Docker Desktop is running」となれば起動完了

### 確認

```bash
docker --version
docker compose version
```

どちらもバージョンが表示されれば OK。

> **注意:** `docker` コマンドを使うときは、必ず Docker Desktop が起動していること。

---

## 5. プロジェクトの依存関係インストール

前提ツールのインストールが完了したら、プロジェクト本体のセットアップに進む。

プロジェクトルート:

```
/Users/kobukotarou/Desktop/english-project
```

### 5-1. ディレクトリ作成

```bash
cd /Users/kobukotarou/Desktop/english-project

mkdir -p backend/app backend/alembic/versions
```

### 5-2. バックエンド（Python）

#### Python バージョンの確認（重要）

本プロジェクトは **Python 3.12 以上** が必須。macOS 標準の `python3` が 3.9 の場合、そのまま `python3 -m venv` を使うとインストールに失敗する。

```bash
python3 --version
# Python 3.12.x であることを確認する
```

3.12 がない、または `python3` が 3.9 の場合は、以下のいずれかを使う。


| 方法                         | コマンド例                                    |
| -------------------------- | ---------------------------------------- |
| Homebrew（推奨）               | `/opt/homebrew/bin/python3.12 --version` |
| Anaconda（Homebrew が使えない場合） | 下記「Anaconda で環境作成」を参照                    |


#### 仮想環境の作成

**方法 A: Homebrew Python 3.12 + venv（通常）**

```bash
cd backend
rm -rf .venv   # 既存の 3.9 環境がある場合は削除
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
```

**方法 B: Anaconda で環境作成（Homebrew Python が壊れている場合）**

```bash
cd backend
rm -rf .venv
/opt/anaconda3/bin/conda create -y -p .venv python=3.12 pip
```

有効化（conda 環境の場合）:

```bash
conda activate /Users/kobukotarou/Desktop/english-project/backend/.venv
```

> conda 環境では `source .venv/bin/activate` が使えない場合がある。  
> 有効化しなくても `.venv/bin/python` / `.venv/bin/pip` を直接指定できる。

#### `backend/pyproject.toml` を作成

```toml
[build-system]
requires = ["setuptools>=61.0"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["app*"]

[project]
name = "english-project-backend"
version = "0.1.0"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "fastapi-users[sqlalchemy]>=13.0.0",
    "sqlalchemy[asyncio]>=2.0.36",
    "asyncpg>=0.30.0",
    "alembic>=1.14.0",
    "openai>=1.55.0",
    "pydantic-settings>=2.6.0",
    "python-dotenv>=1.0.0",
    "greenlet>=3.1.0",
]

[project.optional-dependencies]
dev = [
    "httpx>=0.28.0",
    "ruff>=0.8.0",
]
```

#### パッケージのインストール

```bash
# backend/ ディレクトリで実行
pip install --only-binary :all: "cryptography>=42,<46"   # 先に実行（ビルドエラー回避）
pip install -e ".[dev]"
```

`pip install -e` が使えない場合:

```bash
pip install --only-binary :all: "cryptography>=42,<46"
pip install fastapi "uvicorn[standard]" "fastapi-users[sqlalchemy]" "sqlalchemy[asyncio]" asyncpg alembic openai pydantic-settings python-dotenv greenlet httpx ruff
```

#### Alembic の初期化

```bash
alembic init alembic
```

#### 動作確認用の最小 API（任意）

`backend/app/main.py` を作成する。

```python
from fastapi import FastAPI

app = FastAPI(title="English Conversation API")


@app.get("/health")
async def health():
    return {"status": "ok"}
```

起動確認:

```bash
uvicorn app.main:app --reload --port 8000
```

ブラウザで [http://localhost:8000/health](http://localhost:8000/health) を開き、`{"status":"ok"}` が返れば OK。確認後は `Ctrl + C` で停止する。

---

### 5-3. フロントエンド（React + Vite）

新しいターミナルを開き、プロジェクトルートから実行する。

#### Vite プロジェクト作成

```bash
cd /Users/kobukotarou/Desktop/english-project

npm create vite@latest frontend -- --template react-ts
cd frontend
npm install
```

#### 追加ライブラリのインストール

```bash
npm install react-router-dom zustand axios
npm install -D openapi-typescript
```

> **注意:** Vite の最新テンプレートは TypeScript 6 を使うが、`openapi-typescript@7.x` は TypeScript `^5.x` を要求する。  
> 本プロジェクトでは `package.json` の `typescript` を `~5.8.3` に設定している。  
> `ERESOLVE` エラーが出た場合は TypeScript のバージョンを確認すること。

#### Tailwind CSS のセットアップ（shadcn の前に必須）

`shadcn init` の前に Tailwind CSS とパスエイリアスを設定する。

```bash
npm install tailwindcss @tailwindcss/vite
```

`vite.config.ts` に Tailwind プラグインと `@` エイリアスを追加する。

```ts
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

`tsconfig.app.json` の `compilerOptions` に追加する。

```json
"baseUrl": ".",
"paths": {
  "@/*": ["./src/*"]
}
```

`src/index.css` を以下にする（shadcn init 時に上書き・拡張される）。

```css
@import "tailwindcss";
```

#### shadcn/ui のセットアップ

```bash
npx shadcn@latest init -t vite -b radix -p nova -y
```

対話形式で行う場合の推奨:


| 質問                | 推奨    |
| ----------------- | ----- |
| Component library | Radix |
| Preset            | Nova  |
| Framework         | Vite  |


#### よく使う UI コンポーネント（任意）

```bash
npx shadcn@latest add input card textarea scroll-area -y
```

> `button` は `init` 時に自動追加される。

> **注意:** コンポーネントが `frontend/@/components` に生成された場合は、`src/components` へ移動する。`@` はパスエイリアスであり、実ディレクトリ名ではない。

#### Vite 初期テンプレートの CSS を削除

shadcn 導入後は `src/App.css` を削除し、`App.tsx` からの import も外す。  
Vite テンプレートの CSS 変数（`--accent`, `--text-h` 等）は shadcn の変数と競合し、色が崩れる。

#### OpenAPI 型生成スクリプト

`frontend/package.json` の `scripts` に追加する。

```json
"generate:api": "openapi-typescript http://localhost:8000/openapi.json -o src/types/api.generated.ts"
```

---

### 5-4. 環境変数・Git 設定

プロジェクトルートに戻る。

```bash
cd /Users/kobukotarou/Desktop/english-project
```

#### `.gitignore`

```gitignore
# Python
backend/.venv/
backend/__pycache__/
backend/**/__pycache__/
backend/*.egg-info/
backend/.pytest_cache/
backend/.ruff_cache/

# Node
frontend/node_modules/
frontend/dist/

# Env
.env
.env.local
.env.*.local

# OS / Editor
.DS_Store
.idea/
.vscode/
*.swp

# Generated
frontend/src/types/api.generated.ts
```

#### `.env.example`

```env
# Backend
DATABASE_URL=postgresql+asyncpg://user:password@host/neondb?sslmode=require
DATABASE_URL_RAW=postgresql://user:password@host/neondb?sslmode=require
OPENAI_API_KEY=sk-your-openai-api-key
JWT_SECRET=your-random-secret-at-least-64-chars
JWT_LIFETIME_SECONDS=3600
CORS_ORIGINS=http://localhost:5173

# Frontend (Vite)
VITE_API_BASE_URL=http://localhost:8000
```

#### `.env` の作成

```bash
cp .env.example .env
```

`.env` をエディタで開き、Neon の接続文字列や OpenAI API キーなど実際の値を設定する（未取得の場合は後からでよい）。

---

### 5-5. Docker 用ファイル（任意）

#### `backend/Dockerfile`

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install --no-cache-dir .

COPY . .

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### `frontend/Dockerfile`（開発用）

```dockerfile
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

#### `docker-compose.yml`（プロジェクトルート）

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
    environment:
      - VITE_API_BASE_URL=http://localhost:8000
    command: npm run dev -- --host
```

Docker で起動する場合（Docker Desktop 起動後）:

```bash
docker compose up --build
```

---

## 6. 動作確認

### 6-1. ツールのバージョン確認

```bash
python3 --version    # 3.12.x
node --version       # v20.x.x
npm --version
docker --version
docker compose version
```

### 6-2. バックエンド

```bash
cd /Users/kobukotarou/Desktop/english-project/backend
source .venv/bin/activate
python -c "import fastapi, fastapi_users, asyncpg, alembic, openai; print('OK')"
uvicorn app.main:app --reload --port 8000
```


| 確認項目         | URL                                                                      |
| ------------ | ------------------------------------------------------------------------ |
| ヘルスチェック      | [http://localhost:8000/health](http://localhost:8000/health)             |
| OpenAPI スキーマ | [http://localhost:8000/openapi.json](http://localhost:8000/openapi.json) |


### 6-3. フロントエンド（別ターミナル）

```bash
cd /Users/kobukotarou/Desktop/english-project/frontend
npm run dev
```

[http://localhost:5173](http://localhost:5173) が開ければ OK。

### 6-4. OpenAPI 型生成（バックエンド起動中に実行）

```bash
cd /Users/kobukotarou/Desktop/english-project/frontend
npm run generate:api
```

`src/types/api.generated.ts` が生成されれば OK。

---

## 7. よくあるトラブル

### `command not found: python3`

Homebrew で Python を入れたあと、ターミナルを再起動する。それでもダメなら [2. Python のインストール](#2-python-のインストール) の PATH 設定を確認する。

### `command not found: node` / `npm`

Node.js の PATH 設定を確認する。ターミナルを再起動する。

### `Cannot connect to the Docker daemon`

Docker Desktop が起動していない。Applications から Docker を起動し、メニューバーのクジラアイコンが安定するまで待つ。

### `pip install` で `ruff` / `IndexError` エラー

**原因:** Python 3.9 の venv と古い pip（20.x）を使用している。

**対処:**

```bash
cd backend
rm -rf .venv
# Python 3.12 で環境を作り直す（上記 5-2 参照）
pip install --upgrade pip
pip install --only-binary :all: "cryptography>=42,<46"
pip install -e ".[dev]"
```

### `cryptography` のビルドエラー（OpenSSL / pkg-config）

**原因:** `cryptography` がソースからビルドされようとしている。

**対処:** ビルド済み wheel を先にインストールする。

```bash
pip install --only-binary :all: "cryptography>=42,<46"
pip install -e ".[dev]"
```

### `pip install` で権限エラー

`sudo pip install` は使わない。必ず venv を有効化してからインストールする。

```bash
cd backend
source .venv/bin/activate
pip install -e ".[dev]"
```

### Apple Silicon Mac で `brew` が見つからない

```bash
eval "$(/opt/homebrew/bin/brew shellenv)"
```

を実行するか、ターミナルを再起動する。

### `npx shadcn init` で Tailwind / import alias エラー

**原因:** Tailwind CSS 未インストール、または `@/`* パスエイリアス未設定。

**対処:** [5-3 の Tailwind CSS のセットアップ](#tailwind-css-のセットアップshadcn-の前に必須) を先に実施してから `init` を再実行する。

### `npm install -D openapi-typescript` で ERESOLVE エラー

**原因:** TypeScript 6 と `openapi-typescript@7.x`（peer: `^5.x`）の競合。

**対処:** `frontend/package.json` の TypeScript を 5.x に下げてから再インストール。

```bash
cd frontend
# package.json の "typescript": "~5.8.3" を確認
npm install
npm install -D openapi-typescript
```

### `npm create vite` でエラー

Node.js 20 以上が入っているか確認する。

```bash
node --version
```

---

## インストールするパッケージ一覧（参照用）

### バックエンド


| パッケージ                            | 用途          |
| -------------------------------- | ----------- |
| fastapi, uvicorn                 | API サーバー    |
| fastapi-users[sqlalchemy]        | 認証（JWT）     |
| sqlalchemy, asyncpg              | DB アクセス     |
| alembic                          | DB マイグレーション |
| openai                           | ChatGPT API |
| pydantic-settings, python-dotenv | 設定・環境変数     |


### フロントエンド


| パッケージ                   | 用途          |
| ----------------------- | ----------- |
| react, vite, typescript | 基盤          |
| react-router-dom        | ルーティング      |
| zustand                 | 状態管理        |
| axios                   | HTTP クライアント |
| tailwindcss + shadcn/ui | UI          |
| openapi-typescript      | API 型生成     |


---

## 次のステップ

セットアップ完了後は [SPEC.md](./SPEC.md) の「16. 実装順序」に従い、以下から実装を進める。

1. DB 接続（Neon）
2. Alembic マイグレーション
3. FastAPI Users 認証
4. セッション CRUD API

---

## 変更履歴


| 日付         | 内容                                                 |
| ---------- | -------------------------------------------------- |
| 2025-06-20 | 初版作成                                               |
| 2025-06-21 | Python 3.12 必須の注意、Anaconda 環境、cryptography 回避手順を追記 |


