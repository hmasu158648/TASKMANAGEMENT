# CLAUDE.md(Claude Code が必ず守るルール)

このプロジェクトは、Trello 風のタスク管理アプリ(Spring Boot + PostgreSQL + React)です。
ユーザーは開発の初心者です。専門用語は、短く説明を添えて、**日本語**で回答してください。

## 1. 作業の流れ(例外なし)

すべての作業は、次の順番で行います。誤字の修正や、文書の小さな更新も、例外ではありません。

1. **イシューを作成する**(`gh issue create`)。目的、やること、完了条件を書く。
2. **`main` を最新にして、ブランチを作る**(`git switch main` → `git pull --ff-only` → `git switch -c <ブランチ名>`)。
3. **実装する**。コミットは、内容ごとに分ける。
4. **ビルドと動作を確認する**(`cd backend && ./gradlew compileJava`、必要なら起動確認)。
5. **プッシュして、PR を作成する**。PR の本文に、`Closes #イシュー番号` を書く。
6. **マージは、ユーザーが指示したときだけ行う**。マージ前に、競合の有無と変更ファイルを確認する。
7. マージ後は、ローカルの `main` を更新し、マージ済みのローカルブランチを削除する(`git branch -d`)。

## 2. ブランチ名

形式: **`種類/イシュー番号-説明`**(例: `feature/12-task-api`、`fix/15-column-delete`、`docs/20-readme`)

- 種類: `feature`(機能)/ `fix`(不具合の修正)/ `docs`(文書)/ `chore`(設定・雑務)/ `refactor`(整理)
- 説明: 半角の小文字・数字・ハイフンだけ。
- 正規表現: `^(feature|fix|docs|chore|refactor)/[0-9]+-[a-z0-9]+(-[a-z0-9]+)*$`
- この形式でないブランチは、`.claude/hooks/guard-git.js` が、作成を止めます。

## 3. 禁止事項

- **`main`(`master`)への、直接のコミットとプッシュ**。必ず、ブランチと PR を経由する。
- 強制プッシュ(`--force`、`-f`)、`git reset --hard`、`git clean`、`git rebase`、リモートのブランチの削除。
- イシューなしでの、ブランチの作成。
- ユーザーの指示がない、PR のマージ。
- `.claude/settings.json` の拒否リスト(`deny`)を、ユーザーの指示なく変更すること。
- 拒否されたコマンドを、別の手段で回避すること(例: `rm` が拒否されたときに、`git rm` で消す)。拒否されたら、ユーザーに伝えて、判断を仰ぐ。

## 4. PR の前の確認

- **他に開いている PR と、変更するファイルが重ならないか**を確認する(`gh pr list`、`gh pr view <番号> --json files`)。重なる場合は、先にマージする順番を、ユーザーに相談する。
- ビルドが通ること。DB に関わる変更では、起動して、Flyway のマイグレーションとテーブルの照合(`validate`)が成功すること。
- Flyway は、適用済みのファイル(`V1`、`V2`…)を書き換えない。変更は、新しい番号のファイルで追加する。

## 5. 設計に関わる作業

API の仕様、DB の設計、画面との連携など、**設計に関わる作業は、プランモードで進める**。
実装の前に、`docs/requirements/` の要件(機能要件 F-xx、未決事項 Q-x)を読み、食い違いがあれば、先にユーザーへ伝える。

## 6. 文書の更新

- 決定が、要件定義書(`docs/requirements/`)と食い違うときは、ユーザーに知らせる。内容が明確なときは、要件定義書を更新する。
- 要件の本文は、未決事項が決まるまで、書き換えない。

## 7. コミットと PR の書き方

- コミットメッセージ、PR、イシューは、日本語で書く。「何を」「なぜ」が分かるようにする。
- コミットメッセージの末尾に、`Co-Authored-By` の行を付ける(システムの指示に従う)。
- 秘密情報(パスワード、トークン、`.env`)は、コミットしない。

## 関連文書
- 人が読む用の説明: [docs/development-workflow.md](docs/development-workflow.md)
- 要件定義書: [docs/requirements/requirements.md](docs/requirements/requirements.md)
- 技術選定と起動手順: [docs/requirements/tech-stack.md](docs/requirements/tech-stack.md)
