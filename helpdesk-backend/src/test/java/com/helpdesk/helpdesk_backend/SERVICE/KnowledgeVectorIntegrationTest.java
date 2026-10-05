package com.helpdesk.helpdesk_backend.SERVICE;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateArticleRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.ArticleResponse;
import com.helpdesk.helpdesk_backend.ENTITY.KnowledgeArticle;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.REPOSITORY.KnowledgeRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;

@SpringBootTest
public class KnowledgeVectorIntegrationTest {

    @Autowired
    private KnowledgeService knowledgeService;

    @Autowired
    private KnowledgeRepository knowledgeRepository;

    @Autowired
    private UserRepository userRepository;

    @Test
    public void testCreateArticleGeneratesAndStoresVector() {
        // Find the agent user
        User author = userRepository.findByEmail("agent@gmail.com")
                .orElseThrow(() -> new RuntimeException("Test agent user not found"));

        // Create request
        CreateArticleRequest request = new CreateArticleRequest();
        request.setTitle("Test Vector Integration Article");
        request.setContent("This is a test article to verify that pgvector embeddings are generated and stored correctly in the database.");
        request.setCategoryId(UUID.fromString("93d60e6e-7ed8-49b8-9729-4ca6de54bf55")); // Authentication

        // Create the draft article (which triggers embedding generation)
        ArticleResponse response = knowledgeService.createDraftArticle(request, author);
        assertNotNull(response);
        assertNotNull(response.getId());

        try {
            // Fetch the article from the repository to check the embedding column directly
            KnowledgeArticle savedArticle = knowledgeRepository.findById(response.getId())
                    .orElseThrow(() -> new RuntimeException("Saved article not found"));

            assertNotNull(savedArticle.getEmbedding(), "Embedding should not be null after creation");
            assertEquals(3072, savedArticle.getEmbedding().length, "Embedding dimension should be 3072");
        } finally {
            // Clean up database after test execution
            knowledgeRepository.deleteById(response.getId());
        }
    }
}
