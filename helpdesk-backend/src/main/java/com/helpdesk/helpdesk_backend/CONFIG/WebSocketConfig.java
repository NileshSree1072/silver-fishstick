package com.helpdesk.helpdesk_backend.CONFIG;


import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    
    
     @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry registry) {
        // Server pushes to /topic/... destinations
        registry.enableSimpleBroker("/topic");

        // Client sends messages to /app/... destinations
        registry.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")          // frontend connects to ws://host/ws
                .setAllowedOriginPatterns("*")
                .withSockJS();               // fallback for older browsers
    }
    
}
