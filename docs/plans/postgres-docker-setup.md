# プラン: Postgres(Docker)の用意とバックエンドの DB 接続

## 背景
バックエンド(`backend/`、Spring Boot 4.0.7、Gradle、Java 25)は雛形の状態で、DB 関連の依存関係と接続設定がコメントアウトされています。Docker 関連ファイルもありません。
ユーザーの環境には Postgres が無いため、Docker で Postgres を用意し、バックエンドから実際に接続できるようにします。
`docs/requirements/tech-stack.md` には当初「Postgres は PC に直接インストール、Docker Compose は任意」と書かれていたため、小さな文書更新も行いました。

## 変更内容
1. **`docker-compose.yml`(リポジトリ直下・新規)**
   - サービス名 `db`、イメージ `postgres:17`(バージョンは要件定義書 Q5 で未確定のため仮置き。その旨を明記)
   - `POSTGRES_DB=taskmanagement`、`POSTGRES_USER=postgres`、`POSTGRES_PASSWORD=postgres`(ローカル開発専用)
   - ポート `5432:5432`、名前付きボリューム `pgdata`、`pg_isready` によるヘルスチェック
2. **`backend/build.gradle`**
   - コメントアウト中の `spring-boot-starter-data-jpa`、`spring-boot-starter-flyway`、`flyway-database-postgresql`、`runtimeOnly org.postgresql:postgresql` を有効化
3. **`backend/src/main/resources/application.yml`**
   - コメントアウト中の datasource / JPA(`ddl-auto: validate`、`open-in-view: false`)/ Flyway 設定を有効化
   - 値は compose ファイルと一致させ、`${DB_URL:...}` などの環境変数による上書きは維持
   - 既存の `V1__init.sql`(`SELECT 1;`)で Flyway の動作確認ができるため、変更しない
4. **`.env.example` は作らない**(既定値は yml と compose ファイルに持たせる)
5. **文書更新**
   - `docs/requirements/tech-stack.md` を「ローカル DB は Docker Compose で起動」に更新

## 進捗
- 完了: 変更内容 1〜5。
- 動作確認: Postgres 17.12 のコンテナが healthy、バックエンドが起動し、Flyway が V1 を適用したことをログで確認済み。
- 未確認: `/actuator/health` が `UP` を返すか、`psql` で `flyway_schema_history` が見えるか。

## 確認方法
- `docker compose up -d` の後、`docker compose ps` で `db` が healthy になる
- `cd backend && ./gradlew bootRun` がデータソースのエラーなく起動し、ログに Flyway の V1 適用が出る
- `curl localhost:8080/actuator/health` が `UP` を返す
- `docker compose exec db psql -U postgres -d taskmanagement -c "\dt"` で `flyway_schema_history` が見える

## 対象外
テーブル定義・エンティティ・リポジトリ・コントローラー(V2 以降のマイグレーションは DB 設計が固まってから)。
