# ドキュメント一覧

タスク管理アプリ(Trello風)のドキュメントです。まず、[要件定義書](requirements/requirements.md)から読んでください。

## 要件定義(What:何を作るか)

| 順番 | 文書 | 内容 |
|---|---|---|
| 1 | [要件定義書](requirements/requirements.md) | 背景・課題・効果、範囲、全体像、未決事項(**入口**) |
| 2 | [機能要件と受け入れ条件](requirements/functional.md) | 機能の一覧(F-xx)と、完成の判断条件 |
| 3 | [ユースケースと操作フロー](requirements/usecases.md) | 利用者が何をするか、操作の流れ |
| 4 | [画面仕様](requirements/screens.md) | 画面レイアウト、動作、遷移、状態 |
| 5 | [データの整理](requirements/data-concept.md) | 概念ER図、データフロー、システム構成 |
| 6 | [非機能要件とリスク](requirements/non-functional.md) | 性能・環境・セキュリティなど |
| 7 | [技術選定](requirements/tech-stack.md) | 使う技術と、その理由 |

## 基本設計(How:どう作るか)
これから作成します(`docs/design/`)。予定:詳細ER図・テーブル定義(`database.md`)、API 仕様(`api.md`)、バリデーションルール(`validation.md`)。

## 書き方のルール
- 詳細は**1か所だけ**に書き、他の文書は ID(F-01、UC-01 など)やリンクで参照する。
- 各文書の先頭に、版・更新日・状態を書く。
- 図は Mermaid 記法で書く(GitHub 上で図として表示される)。
