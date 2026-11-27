package com.example.taskmanagement.dto;

import com.example.taskmanagement.entity.Priority;
import com.example.taskmanagement.entity.Task;
import java.time.Instant;
import java.time.LocalDate;

/** API が返すタスク(エンティティをそのまま返さず、公開する項目だけを持つ)。 */
public record TaskResponse(
        Long id,
        String title,
        String description,
        Priority priority,
        Long columnId,
        String columnTitle,
        int position,
        LocalDate dueDate,
        Instant createdAt,
        Instant updatedAt) {

    /** トランザクション内で呼ぶこと(列を遅延読み込みするため)。 */
    public static TaskResponse from(Task task) {
        return new TaskResponse(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getPriority(),
                task.getColumn().getId(),
                task.getColumn().getTitle(),
                task.getPosition(),
                task.getDueDate(),
                task.getCreatedAt(),
                task.getUpdatedAt());
    }
}
