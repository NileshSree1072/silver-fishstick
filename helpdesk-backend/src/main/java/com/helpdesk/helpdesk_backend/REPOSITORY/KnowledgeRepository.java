package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.KnowledgeArticle;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENTITY.User;

@Repository
public interface KnowledgeRepository extends JpaRepository<KnowledgeArticle, UUID> {

    //public
    List<KnowledgeArticle> findByIsPublishedTrueOrderByCreatedAtDesc();

    //public
    List<KnowledgeArticle> findByIsPublishedTrueAndCategoryOrderByCreatedAtDesc(Category category);

    boolean existsByCategory(Category category);
            

    //agent
    List<KnowledgeArticle> findByAuthorOrderByCreatedAtDesc(User author);

    //admin
    List<KnowledgeArticle> findByIsPublishedFalseOrderByCreatedAtDesc();

    //search artciles by title or content (case-insensitive, partial match)
    @Query("""
            SELECT k FROM KnowledgeArticle k
            WHERE k.isPublished = TRUE
              AND (LOWER(k.title) LIKE LOWER(CONCAT('%', :query, '%')) 
                   OR LOWER(k.content) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY k.createdAt DESC
            """)
    List<KnowledgeArticle> searchPublishedArticles(@Param("query") String query);

    //check if an article with the same title already exists (to prevent duplicates)
    boolean existsByTitleAndIsPublishedTrue(String title);

    //count pending approval - used for admin dashboard page
    long countByIsPublishedFalse();



}
