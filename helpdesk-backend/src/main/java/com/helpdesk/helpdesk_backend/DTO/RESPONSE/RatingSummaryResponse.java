package com.helpdesk.helpdesk_backend.DTO.RESPONSE;

import java.util.*;

import lombok.*;

// Used in admin analytics

@Data
@Builder
public class RatingSummaryResponse {
    private Double              overallAverage;
    private long                totalRatings;
    private Map<Integer, Long>  scoreDistribution;  // {1: 5, 2: 3, 3: 10, 4: 25, 5: 40}
    private List<AgentRating>   agentRatings;
    private List<CategoryRating> categoryRatings;

    @Data
    @Builder
    public static class AgentRating {
        private UUID   agentId;
        private String agentName;
        private Double averageScore;
        private long   totalRatings;
    }

    @Data
    @Builder
    public static class CategoryRating {
        private String categoryName;
        private Double averageScore;
        private long   totalRatings;
    }
}
