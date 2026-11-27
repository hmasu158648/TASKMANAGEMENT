package com.example.taskmanagement.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

/**
 * ボードの列(「未着手」「進行中」など)。
 * 名前は、jakarta.persistence.Column との重複を避けるため BoardColumn とする。
 */
@Entity
@Table(name = "board_column")
public class BoardColumn {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    /** 列の並び順(左から右)。 */
    @Column(nullable = false)
    private int position;

    /** 列ごとの並び順の選択(手動 / 優先度順 / 期限順)。 */
    @Enumerated(EnumType.STRING)
    @Column(name = "sort_mode", nullable = false, length = 20)
    private SortMode sortMode = SortMode.MANUAL;

    protected BoardColumn() {
        // JPA 用
    }

    public BoardColumn(String title, int position) {
        this.title = title;
        this.position = position;
    }

    public Long getId() { return id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public int getPosition() { return position; }
    public void setPosition(int position) { this.position = position; }

    public SortMode getSortMode() { return sortMode; }
    public void setSortMode(SortMode sortMode) { this.sortMode = sortMode; }
}
