package com.example.taskmanagement.controller;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItems;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.example.taskmanagement.entity.BoardColumn;
import com.example.taskmanagement.entity.Priority;
import com.example.taskmanagement.entity.Task;
import com.example.taskmanagement.repository.BoardColumnRepository;
import com.example.taskmanagement.repository.TaskRepository;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * タスクの読み取り API のテスト。実際の PostgreSQL(docker compose で起動したもの)を使う。
 * テストごとに、トランザクションを取り消す(@Transactional)ので、データは残らない。
 * 開発用のデータが入っていても結果が変わらないよう、タイトルの先頭の「[test]」で、検索の範囲を絞る。
 *
 * dev プロファイルで起動した DB には、テストデータ(R__test_data.sql)が適用済みと記録されている。
 * テストは dev プロファイルなしで動くため、そのファイルが見つからない。それをエラーにしないよう、
 * 繰り返し型(R__)の「適用済みだが見つからない」だけを無視する。V の検証は、そのまま行う。
 */
@SpringBootTest(properties = "spring.flyway.ignore-migration-patterns=repeatable:missing")
@AutoConfigureMockMvc
@Transactional
class TaskControllerTest {

    private static final String MARK = "[test]";

    @Autowired MockMvc mvc;
    @Autowired TaskRepository taskRepository;
    @Autowired BoardColumnRepository columnRepository;

    BoardColumn colA;
    BoardColumn colB;
    Task review;

    @BeforeEach
    void setUp() {
        // 列は、既存の列(位置 0〜2)より後ろに置く
        colA = columnRepository.save(new BoardColumn(MARK + "列A", 1000));
        colB = columnRepository.save(new BoardColumn(MARK + "列B", 1001));

        // 手動の並び順: Review plan, 資料作成, 会議の準備, 100%達成, 100X, レポート
        task("資料作成", Priority.HIGH, colA, 1, LocalDate.of(2030, 1, 10));
        review = task("Review plan", Priority.LOW, colA, 0, null);
        task("会議の準備", Priority.MEDIUM, colA, 2, LocalDate.of(2030, 1, 5));
        task("100%達成", Priority.MEDIUM, colB, 0, LocalDate.of(2030, 1, 20));
        task("100X", Priority.HIGH, colB, 1, null);
        task("レポート", Priority.LOW, colB, 2, LocalDate.of(2030, 1, 1));
    }

    private Task task(String title, Priority priority, BoardColumn column, int position, LocalDate dueDate) {
        Task t = new Task(MARK + " " + title, column);
        t.setDescription(title + "の説明");
        t.setPriority(priority);
        t.setPosition(position);
        t.setDueDate(dueDate);
        return taskRepository.save(t);
    }

    @Test
    void 一覧は手動の並び順で返る() throws Exception {
        mvc.perform(get("/api/tasks").param("q", MARK))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", contains(
                        "[test] Review plan", "[test] 資料作成", "[test] 会議の準備",
                        "[test] 100%達成", "[test] 100X", "[test] レポート")));
    }

    @Test
    void レスポンスに列の情報と各項目が含まれる() throws Exception {
        mvc.perform(get("/api/tasks").param("q", "資料作成"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("[test] 資料作成"))
                .andExpect(jsonPath("$[0].description").value("資料作成の説明"))
                .andExpect(jsonPath("$[0].priority").value("HIGH"))
                .andExpect(jsonPath("$[0].columnId").value(colA.getId()))
                .andExpect(jsonPath("$[0].columnTitle").value("[test]列A"))
                .andExpect(jsonPath("$[0].position").value(1))
                .andExpect(jsonPath("$[0].dueDate").value("2030-01-10"))
                .andExpect(jsonPath("$[0].createdAt").exists())
                .andExpect(jsonPath("$[0].updatedAt").exists());
    }

    @Test
    void タイトル検索は部分一致で大文字小文字を区別しない() throws Exception {
        mvc.perform(get("/api/tasks").param("q", "[TEST] REVIEW"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("[test] Review plan"));
        mvc.perform(get("/api/tasks").param("q", "準備"))
                .andExpect(jsonPath("$[*].title", contains("[test] 会議の準備")));
    }

    @Test
    void タイトル検索のワイルドカード文字はふつうの文字として扱う() throws Exception {
        // 「100%」は、「100%達成」だけに一致する(「100X」には一致しない)
        mvc.perform(get("/api/tasks").param("q", "100%"))
                .andExpect(jsonPath("$[*].title", contains("[test] 100%達成")));
        // 「_」も同様(任意の 1 文字としては扱わない)
        mvc.perform(get("/api/tasks").param("q", "[test]_"))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void 空の検索語は全件を返す() throws Exception {
        // 開発用のデータが入っていることもあるので、「テスト用の 6 件を含む」ことを確認する
        mvc.perform(get("/api/tasks").param("q", ""))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].title", hasItems(
                        "[test] Review plan", "[test] 資料作成", "[test] 会議の準備",
                        "[test] 100%達成", "[test] 100X", "[test] レポート")));
    }

    @Test
    void 優先度で絞り込める() throws Exception {
        mvc.perform(get("/api/tasks").param("q", MARK).param("priority", "HIGH"))
                .andExpect(jsonPath("$[*].title", containsInAnyOrder("[test] 資料作成", "[test] 100X")));
        mvc.perform(get("/api/tasks").param("q", MARK).param("priority", "LOW"))
                .andExpect(jsonPath("$[*].title", containsInAnyOrder("[test] Review plan", "[test] レポート")));
    }

    @Test
    void 列で絞り込める() throws Exception {
        mvc.perform(get("/api/tasks").param("columnId", colB.getId().toString()))
                .andExpect(jsonPath("$[*].title", contains("[test] 100%達成", "[test] 100X", "[test] レポート")));
    }

    @Test
    void 優先度順は高中低の順に並ぶ() throws Exception {
        // 同じ優先度の中では、手動の並び順
        mvc.perform(get("/api/tasks").param("q", MARK).param("sort", "PRIORITY"))
                .andExpect(jsonPath("$[*].title", contains(
                        "[test] 資料作成", "[test] 100X",
                        "[test] 会議の準備", "[test] 100%達成",
                        "[test] Review plan", "[test] レポート")));
    }

    @Test
    void 期限順は近い順で期限なしは最後() throws Exception {
        mvc.perform(get("/api/tasks").param("q", MARK).param("sort", "DUE_DATE"))
                .andExpect(jsonPath("$[*].title", contains(
                        "[test] レポート", "[test] 会議の準備", "[test] 資料作成", "[test] 100%達成",
                        "[test] Review plan", "[test] 100X")));
    }

    @Test
    void 条件を組み合わせて検索できる() throws Exception {
        mvc.perform(get("/api/tasks")
                        .param("q", "100")
                        .param("priority", "HIGH")
                        .param("columnId", colB.getId().toString())
                        .param("sort", "DUE_DATE"))
                .andExpect(jsonPath("$[*].title", contains("[test] 100X")));
    }

    @Test
    void 詳細を取得できる() throws Exception {
        mvc.perform(get("/api/tasks/{id}", review.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(review.getId()))
                .andExpect(jsonPath("$.title").value("[test] Review plan"))
                .andExpect(jsonPath("$.dueDate").doesNotExist());
    }

    @Test
    void 存在しないIDは404() throws Exception {
        mvc.perform(get("/api/tasks/{id}", 999999999L)).andExpect(status().isNotFound());
    }

    @Test
    void 不正な値は400() throws Exception {
        mvc.perform(get("/api/tasks").param("priority", "XXX")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/tasks").param("sort", "XXX")).andExpect(status().isBadRequest());
        mvc.perform(get("/api/tasks").param("columnId", "abc")).andExpect(status().isBadRequest());
    }
}
