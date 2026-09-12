package com.helpdesk.helpdesk_backend.ENTITY;

import java.time.LocalDateTime;
import java.util.UUID;



import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "knowledge_articles")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KnowledgeArticle {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @NotBlank
    private String title;

    @Column(columnDefinition = "TEXT",nullable = false)
    private String content;
    
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="author_id")
    private User author;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="category_id")
    private Category category;

    @Column(columnDefinition = "vector(1536)")
    @org.hibernate.annotations.ColumnTransformer(write = "CAST(? AS vector)")
    @jakarta.persistence.Convert(converter = com.helpdesk.helpdesk_backend.UTIL.VectorConverter.class)
    private float[] embedding;

    @Builder.Default
    private boolean isPublished = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
    @Builder.Default
    private LocalDateTime updatedAt  = LocalDateTime.now();

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }




}
