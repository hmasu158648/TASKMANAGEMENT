# 技術選定

| 項目 | 内容 |
|---|---|
| 版 | 0.7(下書き) |
| 更新日 | 2026-11-27 |
| 状態 | レビュー待ち |
| 上位文書 | [要件定義書](requirements.md) |

> **技術選定**とは、「どの技術で作るか」を、理由とともに決めることです。今回は、**スクールの講師から、次の技術を指定されました。**
> - サーバー:**Java + Spring Boot**
> - 画面:**React**(Next.js は、今回は対象外)
> - データベース:**PostgreSQL**
>
> これを前提に、それ以外のツールを、Java・Spring Boot・React に合わせて選びました。サーバー側のバージョン(Java 25、Spring Boot 4.0、Gradle 9.9.1)は、バックエンドの環境構築で確定しました。残りのバージョンと、ライブラリの最終決定は、基本設計(`docs/design/`)で行います。

## 1. 指定された技術(変更しない)

| 区分 | 技術 | 補足 |
|---|---|---|
| サーバー | Java + Spring Boot | API(画面からの要求を受けて、データベースを操作する部分)を作る |
| 画面 | React | Next.js は使わない(対象外)。React だけで、1画面のアプリを作る |
| データベース | PostgreSQL(**17 を仮採用**。バージョンは [Q5](requirements.md) で講師に確認中) | Docker Compose で PostgreSQL を起動し、localhost で運用する |

## 2. 合わせて選んだツール

### 2.1 画面(React 側)
| 区分 | 採用 | 選んだ理由 |
|---|---|---|
| 言語 | TypeScript | 型でミスを早く見つけられる。React の標準的な組み合わせ |
| 作成環境・ビルド | Vite(React + TypeScript のひな形) | 軽く、速い。Next.js を使わない React の、現在の標準的な作り方 |
| パッケージ管理 | npm(Node.js の LTS 版) | Node.js に標準で付属する。追加の導入が不要 |
| スタイル(CSS) | Tailwind CSS | 講師の指定。クラス名で見た目を指定でき、Vite と組み合わせやすい |
| ドラッグ&ドロップ | dnd-kit(第1候補) | React 用で、列間の移動と並び替えを、少ない手間で実現できる |
| 状態管理 | React 標準(useState / useReducer) | 1画面のアプリなので、追加のライブラリは不要 |
| API 通信 | ブラウザ標準の `fetch` | 追加のライブラリが不要 |
| テスト | Vitest + React Testing Library | Vite と相性がよく、設定が少ない |
| コードの品質 | ESLint + Prettier | 書き方の誤りと、体裁のばらつきを、自動で検出・整える |

### 2.2 サーバー(Java・Spring Boot 側)
| 区分 | 採用 | 選んだ理由 |
|---|---|---|
| Java のバージョン | **Java 25**(最新の LTS 版) | 長期サポートがある最新の版。Spring Boot 4.0 が対応している。検討した版:25 / 21 / 17(17 は Spring Boot 4.x の最低条件) |
| Spring Boot のバージョン | **4.0 系(4.0.7)** | Spring Boot に正式な LTS はなく、無料サポートは約13か月。3.5 系は無料サポートが終了済みのため、4.x を採用。検討した版:4.1(最新)/ 4.0 / 3.5 |
| ビルド・依存管理 | Gradle(9.9.1、ラッパー `gradlew` を同梱) | 講師の指定。ひな形は `backend/` に作成済み(Spring Initializr は使わず、手書きで作成) |
| Web API | Spring Web(REST、JSON 形式) | Spring Boot の標準 |
| DB アクセス | Spring Data JPA(Hibernate) | Spring Boot の標準的な方法。SQL を直接書く量を減らせる |
| DB の接続 | PostgreSQL JDBC ドライバー。接続先は `application.yml` に設定済み(`localhost:5432`、DB 名 `taskmanagement`) | PostgreSQL に接続するための部品。接続先とパスワードは、環境変数(`DB_URL`、`DB_USER`、`DB_PASSWORD`)で上書きできる。既定のパスワードは、ローカル開発専用 |
| 入力チェック | Bean Validation(Spring Boot Starter Validation) | タイトル必須などのチェック(F-04)を、サーバー側でも行う |
| テーブルの作成・変更 | Flyway(定義は `backend/src/main/resources/db/migration/` に `V1__init.sql`、`V2__create_task.sql` の形式で置く) | テーブルの定義を、ファイルで管理できる。起動時に、未適用のものだけが自動で適用される。適用済みのファイルは書き換えず、変更は新しい番号のファイルで追加する。Hibernate は `ddl-auto: validate` とし、テーブルは作らず、エンティティとの一致を確認するだけにしている |
| テスト | JUnit 5 + Spring Boot Test | Spring Boot に標準で含まれる |
| 設定の管理 | `application.yml` | 接続先などを、プログラムと分けて管理する |

### 2.3 開発・運用の環境
| 区分 | 採用 | 選んだ理由 |
|---|---|---|
| PostgreSQL の起動 | Docker Compose(リポジトリ直下の `docker-compose.yml`、イメージ `postgres:17`、データは名前付きボリューム `pgdata` に保存) | `docker compose up -d` で起動できる。PC に直接インストールする方法でも可(接続先は同じ localhost:5432) |
| バックアップ | `pg_dump`(PostgreSQL の標準ツール) | データベースを、ファイルに書き出せる |
| バージョン管理 | Git + GitHub | すでに使っている |
| 開発のときの通信 | Vite の開発サーバーから、Spring Boot の API へ中継する | 画面(例:5173 番)とサーバー(例:8080 番)を、別々に動かしながら開発できる。基本設計で確定する |

### 2.4 現在の起動手順(開発用)
1. リポジトリ直下で、`docker compose up -d` を実行する(PostgreSQL が起動し、`healthy` になるまで待つ)。
2. `backend/` で、`./gradlew bootRun` を実行する(サーバーが起動し、Flyway が未適用のテーブル定義を適用する)。
   - 動作確認用のテストデータを入れるときは、`./gradlew bootRun --args='--spring.profiles.active=dev'` で起動する(`dev` プロファイル。タスクが空のときだけ、12 件が入る)。通常の起動では、入らない。
   - API の確認方法は、[タスク API](../api/tasks.md) を参照する。
3. 止めるときは、サーバーを終了し、`docker compose down` を実行する(データは `pgdata` に残る)。

※ README への記載は、まだ行っていない([非機能要件](non-functional.md) の R-2 を参照)。

## 3. 検討した代替案

| 区分 | 代替案 | 採用しなかった理由 |
|---|---|---|
| 画面 | Next.js | **対象外**。講師から、今回は使わない方針の指定があった。サーバー側の機能は、Spring Boot が担う |
| 画面 | HTML / CSS / JavaScript のみ | 当初の案。画面イメージの確認用プロトタイプ(`prototype/`)としては使ったが、本番には React を使う |
| サーバー | Node.js + Express | 当初の案。講師から Spring Boot の指定があったため変更した |
| データベース | MySQL | 当初の案。講師から PostgreSQL の指定があったため変更した |
| データベース | SQLite / H2 | 設定は簡単だが、指定の PostgreSQL に合わせる |
| データベース | Supabase などのクラウド DB | 外部サービスのアカウントが必要で、データを自分の PC に置く方針と合わない |
| データ保存 | localStorage(ブラウザ内の保存) | 「実際のデータベースで運用したい」という要望に合わないため、変更した(プロトタイプでのみ使用) |
| ビルド | Maven | 使えるが、今回は Gradle を使う方針のため採用しない |
| スタイル | 通常の CSS / CSS Modules | 使えるが、Tailwind CSS を使う方針のため採用しない |
| DB アクセス | MyBatis | 使えるが、Spring Boot では JPA が標準的。SQL を細かく制御したくなったら、検討する |
| ドラッグ&ドロップ | ブラウザ標準の API(HTML5 Drag and Drop) | ライブラリなしで実現できるが、React では状態との連携が複雑になりやすい。dnd-kit のほうが扱いやすい |
| 状態管理 | Redux など | 1画面・小規模なので、過剰になる |

## 関連文書
- 構成の全体像:[データの整理](data-concept.md)(システム構成図)
- 動作環境・保守性:[非機能要件](non-functional.md)
