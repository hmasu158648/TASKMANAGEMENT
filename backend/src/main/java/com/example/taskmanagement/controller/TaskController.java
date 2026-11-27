package com.example.taskmanagement.controller;

import com.example.taskmanagement.dto.TaskResponse;
import com.example.taskmanagement.entity.Priority;
import com.example.taskmanagement.entity.SortMode;
import com.example.taskmanagement.service.TaskService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {

    private final TaskService taskService;

    public TaskController(TaskService taskService) {
        this.taskService = taskService;
    }

    /**
     * タスクの一覧・検索。条件は、すべて省略できる(組み合わせて使える)。
     * 値が不正(例: priority=XXX)なときは、400 になる。
     */
    @GetMapping
    public List<TaskResponse> list(
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Priority priority,
            @RequestParam(required = false) Long columnId,
            @RequestParam(defaultValue = "MANUAL") SortMode sort) {
        return taskService.search(q, priority, columnId, sort);
    }

    /** タスクの詳細。見つからなければ、404。 */
    @GetMapping("/{id}")
    public TaskResponse get(@PathVariable Long id) {
        return taskService.get(id);
    }
}
