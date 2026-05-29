package com.helpdesk.helpdesk_backend.SERVICE;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.CreateTicketRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.TicketResponse;
import com.helpdesk.helpdesk_backend.ENTITY.Reply;
import com.helpdesk.helpdesk_backend.ENTITY.Ticket;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.TicketStatus;
import com.helpdesk.helpdesk_backend.REPOSITORY.ReplyRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.TicketRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.SimilarTicketRepository;

@SpringBootTest
public class BotReplyIntegrationTest {

    @Autowired
    private TicketService ticketService;

    @Autowired
    private TicketRepository ticketRepo;

    @Autowired
    private UserRepository userRepo;

    @Autowired
    private ReplyRepository replyRepo;

    @Test
    public void testAutoBotReplyAndResolution() throws Exception {
        // Find the user who will create the ticket
        User creator = userRepo.findByEmail("test@gmail.com")
                .orElseThrow(() -> new RuntimeException("Test user not found"));

        // Create request identical to "Sample ticket C" to trigger matching
        CreateTicketRequest request = new CreateTicketRequest();
        request.setTitle("Sample ticket C");
        request.setDescription("sample ticket to check email services");
        request.setCategoryId(UUID.fromString("93d60e6e-7ed8-49b8-9729-4ca6de54bf55")); // Authentication

        // Submit the ticket (this triggers autoAssign and async aiService.processNewTicket)
        TicketResponse response = ticketService.createTicket(request, creator);
        assertNotNull(response);
        assertNotNull(response.getId());

        // Wait up to 45 seconds for the async AI process to finish
        Ticket ticketAfterAi = null;
        for (int i = 0; i < 45; i++) {
            Thread.sleep(1000);
            ticketAfterAi = ticketRepo.findById(response.getId()).orElse(null);
            if (ticketAfterAi != null && ticketAfterAi.isAiResolved()) {
                break;
            }
        }

        assertNotNull(ticketAfterAi);
        
        try {
            // Verify if the ticket is marked resolved by AI
            assertTrue(ticketAfterAi.isAiResolved(), "Ticket should be marked as AI resolved");
            assertEquals(TicketStatus.RESOLVED, ticketAfterAi.getStatus(), "Ticket status should be RESOLVED");

            // Verify if the AI reply is stored in the replies table
            List<Reply> replies = replyRepo.findByTicketOrderByCreatedAtAsc(ticketAfterAi);
            boolean hasAiReply = replies.stream().anyMatch(Reply::isAiGenerated);
            assertTrue(hasAiReply, "Ticket should have an AI-generated reply");

            // Print the AI response message
            Reply aiReply = replies.stream().filter(Reply::isAiGenerated).findFirst().orElse(null);
            assertNotNull(aiReply);
            System.out.println("====== AUTO BOT REPLY MESSAGE ======");
            System.out.println(aiReply.getMessage());
            System.out.println("====================================");
        } finally {
            // Clean up database after test execution
            replyRepo.deleteAll(replyRepo.findByTicketOrderByCreatedAtAsc(ticketAfterAi));
            ticketRepo.deleteById(ticketAfterAi.getId());
        }
    }

    @Test
    public void testAutoBotReplyFromKnowledgeArticle() throws Exception {
        // Find the user who will create the ticket
        User creator = userRepo.findByEmail("test@gmail.com")
                .orElseThrow(() -> new RuntimeException("Test user not found"));

        // Create a ticket that matches the "How to reset your account password" KB article
        CreateTicketRequest request = new CreateTicketRequest();
        request.setTitle("Password reset");
        request.setDescription("I need to reset my account password. I forgot the password and got locked out.");
        request.setCategoryId(UUID.fromString("93d60e6e-7ed8-49b8-9729-4ca6de54bf55")); // Authentication

        // Submit the ticket
        TicketResponse response = ticketService.createTicket(request, creator);
        assertNotNull(response);
        assertNotNull(response.getId());

        // Wait up to 45 seconds for the async AI process to finish
        Ticket ticketAfterAi = null;
        for (int i = 0; i < 45; i++) {
            Thread.sleep(1000);
            ticketAfterAi = ticketRepo.findById(response.getId()).orElse(null);
            if (ticketAfterAi != null && ticketAfterAi.isAiResolved()) {
                break;
            }
        }

        assertNotNull(ticketAfterAi);
        
        try {
            // Verify if the ticket is marked resolved by AI
            assertTrue(ticketAfterAi.isAiResolved(), "Ticket should be marked as AI resolved by KB article match");
            assertEquals(TicketStatus.RESOLVED, ticketAfterAi.getStatus(), "Ticket status should be RESOLVED");

            // Verify if the AI reply is stored in the replies table
            List<Reply> replies = replyRepo.findByTicketOrderByCreatedAtAsc(ticketAfterAi);
            boolean hasAiReply = replies.stream().anyMatch(Reply::isAiGenerated);
            assertTrue(hasAiReply, "Ticket should have an AI-generated reply matching KB article");

            // Print the AI response message
            Reply aiReply = replies.stream().filter(Reply::isAiGenerated).findFirst().orElse(null);
            assertNotNull(aiReply);
            System.out.println("====== AUTO BOT REPLY MESSAGE (KB MATCH) ======");
            System.out.println(aiReply.getMessage());
            System.out.println("==============================================");
        } finally {
            // Clean up database after test execution
            replyRepo.deleteAll(replyRepo.findByTicketOrderByCreatedAtAsc(ticketAfterAi));
            ticketRepo.deleteById(ticketAfterAi.getId());
        }
    }

    @Autowired
    private SimilarTicketRepository similarTicketRepo;
    @Autowired
    private EmbeddingService embeddingService;

    @Test
    public void printSimilarity() {
        String[] queries = {
            "I forgot my account password. How can I reset it?",
            "My GlobalProtect VPN is not connecting. How can I fix it?",
            "Can visitors connect to the guest network?"
        };

        for (String query : queries) {
            System.out.println("--- Query: '" + query + "' ---");
            float[] embedding = embeddingService.embed(query);
            StringBuilder sb = new StringBuilder("[");
            for (int i = 0; i < embedding.length; i++) {
                sb.append(embedding[i]);
                if (i < embedding.length - 1) sb.append(",");
            }
            sb.append("]");
            String embeddingStr = sb.toString();

            List<Object[]> results = similarTicketRepo.findSimilarKnowledgeArticles(embeddingStr, 0.0, 3);
            for (Object[] row : results) {
                System.out.println("TITLE: " + row[1] + " | SIMILARITY: " + row[row.length - 1]);
            }
        }
        System.out.println("=============================================");
    }

    @Test
    public void printTicketSimilarity() {
        float[] embedding = embeddingService.embed("Sample ticket C sample ticket to check email services");
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < embedding.length; i++) {
            sb.append(embedding[i]);
            if (i < embedding.length - 1) sb.append(",");
        }
        sb.append("]");
        String embeddingStr = sb.toString();

        List<Object[]> results = similarTicketRepo.findSimilarResolvedTickets(embeddingStr, 0.0, 5);
        System.out.println("====== TICKET SIMILARITY RESULTS ======");
        for (Object[] row : results) {
            System.out.println("TITLE: " + row[1] + " | SIMILARITY: " + row[row.length - 1]);
        }
        System.out.println("=======================================");
    }
}
