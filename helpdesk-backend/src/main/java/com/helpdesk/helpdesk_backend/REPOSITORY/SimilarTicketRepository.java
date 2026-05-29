package com.helpdesk.helpdesk_backend.REPOSITORY;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.helpdesk.helpdesk_backend.ENTITY.Ticket;

@Repository
public interface SimilarTicketRepository extends JpaRepository<Ticket, UUID> {

    // Find top N resolved tickets most similar to the given embedding
    // Uses cosine distance (1 - cosine_similarity)
    // Lower distance = more similar
    @Query(value = """
        SELECT t.*, 
               1 - (t.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM tickets t
        WHERE t.status = 'RESOLVED'
          AND t.embedding IS NOT NULL
          AND 1 - (t.embedding <=> CAST(:embedding AS vector)) > :threshold
        ORDER BY t.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findSimilarResolvedTickets(
        @Param("embedding")  String embedding,
        @Param("threshold")  double threshold,
        @Param("limit")      int    limit
    );

    // Same but searches knowledge articles too
    @Query(value = """
        SELECT ka.*,
               1 - (ka.embedding <=> CAST(:embedding AS vector)) AS similarity
        FROM knowledge_articles ka
        WHERE ka.is_published = TRUE
          AND ka.embedding IS NOT NULL
          AND 1 - (ka.embedding <=> CAST(:embedding AS vector)) > :threshold
        ORDER BY ka.embedding <=> CAST(:embedding AS vector)
        LIMIT :limit
        """, nativeQuery = true)
    List<Object[]> findSimilarKnowledgeArticles(
        @Param("embedding")  String embedding,
        @Param("threshold")  double threshold,
        @Param("limit")      int    limit
    );
}
