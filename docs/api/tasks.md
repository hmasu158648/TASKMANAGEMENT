# タスク API(読み取り)

タスクの一覧・検索・詳細を取得する API です。要件は、F-40(タイトル検索)、F-41(優先度の絞り込み)、F-42(並び替え)です。
登録・更新・削除は、まだありません。

| 項目 | 内容 |
|---|---|
| 版 | 0.1(下書き) |
| 更新日 | 2026-11-27 |
| 上位文書 | [機能要件](../requirements/functional.md) |

## 1. 一覧・検索 `GET /api/tasks`

条件は、すべて省略できます。複数指定すると、すべてを満たすタスクだけが返ります。

| パラメータ | 内容 | 例 |
|---|---|---|
| `q` | タイトルに含まれる文字(部分一致。大文字・小文字を区別しない)。空なら全件(F-40) | `?q=レポート` |
| `priority` | 優先度。`HIGH`(高)/ `MEDIUM`(中)/ `LOW`(低)(F-41) | `?priority=HIGH` |
| `columnId` | 列の ID | `?columnId=1` |
| `sort` | 並び順(F-42)。`MANUAL`(手動。既定)/ `PRIORITY`(優先度順)/ `DUE_DATE`(期限順) | `?sort=DUE_DATE` |

**並び順**
- `MANUAL`: 列の並び順 → 列の中の並び順(`position`)。
- `PRIORITY`: 高 → 中 → 低。
- `DUE_DATE`: 期限が近い順(期限なしは、最後)。
- `PRIORITY` と `DUE_DATE` で同順位のときは、`MANUAL` の並び順になります。

**返す内容**: タスクの配列(JSON)。

```json
[
  {
    "id": 168,
    "title": "要件定義書のレビュー",
    "description": "機能要件と未決事項を確認する",
    "priority": "HIGH",
    "columnId": 1,
    "columnTitle": "未着手",
    "position": 0,
    "dueDate": "2026-11-29",
    "createdAt": "2026-11-27T07:09:20.128Z",
    "updatedAt": "2026-11-27T07:09:20.128Z"
  }
]
```

- `description` と `dueDate` は、未設定のとき `null` です。
- 日時(`createdAt`、`updatedAt`)は UTC です。

**エラー**
- `400`: 値が不正(例: `priority=XXX`、`sort=XXX`、`columnId=abc`)。

## 2. 詳細 `GET /api/tasks/{id}`

- 見つかれば、タスク 1 件(上と同じ項目)を返します。
- 見つからなければ、`404` です。

## 3. 動作の確認(テストデータを入れて、API を呼ぶ)

### 3.1 準備
1. リポジトリ直下で、データベースを起動します。
   ```
   docker compose up -d
   ```
2. `backend/` で、**`dev` プロファイル**で起動します(テストデータ 12 件が入ります)。
   ```
   cd backend
   ./gradlew bootRun --args='--spring.profiles.active=dev'
   ```
   - ログに `Migrating schema "public" with repeatable migration "test data"` と出れば、テストデータが入っています(すでにデータがあるときは、入りません)。
   - **通常の起動(`--args` なし)では、テストデータは入りません。**

### 3.2 API を呼ぶ(別のターミナルで)
ブラウザで URL を開いても、確認できます(GET のため)。

| 確認すること | コマンド |
|---|---|
| 全件(12 件) | `curl "http://localhost:8080/api/tasks"` |
| タイトル検索(F-40) | `curl "http://localhost:8080/api/tasks?q=%E3%83%AC%E3%83%9D%E3%83%BC%E3%83%88"`(「レポート」を URL の形式にしたもの) |
| 大文字・小文字を区別しない | `curl "http://localhost:8080/api/tasks?q=REVIEW"`(「Review the ER diagram」が返る) |
| 優先度の絞り込み(F-41) | `curl "http://localhost:8080/api/tasks?priority=HIGH"` |
| 列の絞り込み | `curl "http://localhost:8080/api/tasks?columnId=1"`(列の ID は、一覧の `columnId` で確認) |
| 優先度順(F-42) | `curl "http://localhost:8080/api/tasks?sort=PRIORITY"` |
| 期限順(F-42) | `curl "http://localhost:8080/api/tasks?sort=DUE_DATE"` |
| 組み合わせ | `curl "http://localhost:8080/api/tasks?priority=HIGH&columnId=1&sort=DUE_DATE"` |
| 詳細 | `curl "http://localhost:8080/api/tasks/<一覧で確認した id>"` |
| 見つからない(404) | `curl -i "http://localhost:8080/api/tasks/999999"` |
| 不正な値(400) | `curl -i "http://localhost:8080/api/tasks?priority=XXX"` |

- 日本語を `q` に使うときは、URL の形式(パーセントエンコード)にします。`curl -G --data-urlencode "q=レポート" "http://localhost:8080/api/tasks"` でも、同じことができます。
- タスクの `id` は、データベースの連番のため、1 から始まるとは限りません。必ず、一覧で確認した `id` を使ってください。

### 3.3 自動テスト
データベースを起動した状態で、次を実行します。実際の PostgreSQL を使い、テストごとにデータを元に戻します(開発用のデータには、影響しません)。
```
cd backend
./gradlew test
```

### 3.4 テストデータを入れ直す
テストデータは、`task` テーブルが空のときだけ入ります。入れ直すときは、タスクを削除してから、`dev` プロファイルで起動し直してください。
```
docker compose exec db psql -U postgres -d taskmanagement -c "DELETE FROM task"
```
さらに、テストデータの内容(`R__test_data.sql`)を変更した場合は、Flyway が変更を検知して、再実行します。
