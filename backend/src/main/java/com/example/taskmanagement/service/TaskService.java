package com.example.taskmanagement.service;

import com.example.taskmanagement.dto.TaskResponse;
import com.example.taskmanagement.entity.Priority;
import com.example.taskmanagement.entity.SortMode;
import com.example.taskmanagement.entity.Task;
import com.example.taskmanagement.repository.TaskRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional(readOnly = true)
public class TaskService {

    /** 手動の並び順: 列の並び順 → カードの並び順 → ID。ほかの並び順の、同順位のときにも使う。 */
    private static final Comparator<Task> MANUAL_ORDER =
            Comparator.comparingInt((Task t) -> t.getColumn().getPosition())
                    .thenComparingInt(Task::getPosition)
                    .thenComparing(Task::getId);

    /**
     * 優先度順(高→中→低)。Priority の宣言順(HIGH, MEDIUM, LOW)をそのまま使うため、
     * Priority の宣言順を変えると、この並び順も変わる。
     */
    private static final Comparator<Task> PRIORITY_ORDER =
            Comparator.comparing(Task::getPriority).thenComparing(MANUAL_ORDER);

    /** 期限順(近い順。期限なしは最後)。 */
    private static final Comparator<Task> DUE_DATE_ORDER =
            Comparator.comparing(Task::getDueDate, Comparator.nullsLast(Comparator.naturalOrder()))
                    .thenComparing(MANUAL_ORDER);

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    /** タスクを検索する(F-40, F-41, F-42)。指定しなかった条件は、使わない。 */
    public List<TaskResponse> search(String q, Priority priority, Long columnId, SortMode sort) {
        Specification<Task> spec = fetchColumn();
        if (q != null && !q.isBlank()) {
            spec = spec.and(titleContains(q.trim()));
        }
        if (priority != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("priority"), priority));
        }
        if (columnId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("column").get("id"), columnId));
        }
        return taskRepository.findAll(spec).stream()
                .sorted(comparatorFor(sort))
                .map(TaskResponse::from)
                .toList();
    }

    /** タスクを 1 件取得する。見つからなければ、404。 */
    public TaskResponse get(Long id) {
        Task task = taskRepository
                .findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "タスクが見つかりません: id=" + id));
        return TaskResponse.from(task);
    }

    private static Comparator<Task> comparatorFor(SortMode sort) {
        return switch (sort == null ? SortMode.MANUAL : sort) {
            case MANUAL -> MANUAL_ORDER;
            case PRIORITY -> PRIORITY_ORDER;
            case DUE_DATE -> DUE_DATE_ORDER;
        };
    }

    /** 列も、一緒に読み込む(1 件ずつ読み込む無駄を、避けるため)。 */
    private static Specification<Task> fetchColumn() {
        return (root, query, cb) -> {
            root.fetch("column");
            return cb.conjunction();
        };
    }

    /** タイトルに、指定の文字を含む(大文字・小文字を区別しない)。% と _ は、ふつうの文字として扱う。 */
    private static Specification<Task> titleContains(String q) {
        String escaped = q.toLowerCase(Locale.ROOT)
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");
        return (root, query, cb) -> cb.like(cb.lower(root.get("title")), "%" + escaped + "%", '\\');
    }
}
