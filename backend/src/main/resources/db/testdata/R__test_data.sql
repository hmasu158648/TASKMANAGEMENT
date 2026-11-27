-- 開発用のテストデータ。dev プロファイルで起動したときだけ、投入される(application-dev.yml を参照)。
-- 繰り返し型のマイグレーション(R__ で始まる)なので、内容を変えたときだけ、再実行される。
-- task テーブルが空のときだけ投入するので、すでにあるデータは、壊さない。
-- 期限は、今日からの相対日数にしている(期限切れのカードも含む)。
INSERT INTO task (title, description, priority, position, due_date, created_at, updated_at, column_id)
SELECT v.title,
       v.description,
       v.priority,
       v.position,
       v.due_date,
       now(),
       now(),
       c.id
FROM (VALUES
    -- 未着手
    ('要件定義書のレビュー',          '機能要件と未決事項を確認する',         'HIGH',   '未着手', 0, CURRENT_DATE + 2),
    ('Docker 環境の手順書を作る',     'README に起動手順を書く',               'MEDIUM', '未着手', 1, CURRENT_DATE + 10),
    ('API 仕様のたたき台を作る',      NULL,                                    'MEDIUM', '未着手', 2, NULL),
    ('買い物リストを整理する',        '私用のメモ',                            'LOW',    '未着手', 3, CURRENT_DATE + 30),
    ('Review the ER diagram',        'English title for case-insensitive search', 'HIGH', '未着手', 4, NULL),
    -- 進行中
    ('タスク読み取り API の実装',     '一覧・検索・詳細',                      'HIGH',   '進行中', 0, CURRENT_DATE + 1),
    ('テストデータの投入',            'dev プロファイルで投入する',            'MEDIUM', '進行中', 1, CURRENT_DATE + 3),
    ('画面プロトタイプの見直し',      NULL,                                    'LOW',    '進行中', 2, NULL),
    ('レポートを提出する',            '期限切れの例',                          'HIGH',   '進行中', 3, CURRENT_DATE - 2),
    -- 完了
    ('PostgreSQL を Docker で起動する', NULL,                                  'MEDIUM', '完了',   0, CURRENT_DATE - 5),
    ('Flyway の導入',                 'マイグレーションを V1〜V3 まで作成',    'MEDIUM', '完了',   1, CURRENT_DATE - 4),
    ('列テーブルの設計',              'board_column と task の関係',           'HIGH',   '完了',   2, CURRENT_DATE - 1)
) AS v(title, description, priority, column_title, position, due_date)
JOIN board_column c ON c.title = v.column_title
WHERE NOT EXISTS (SELECT 1 FROM task);
