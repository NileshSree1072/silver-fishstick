package com.helpdesk.helpdesk_backend.CONFIG;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENTITY.Category;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.REPOSITORY.CategoryRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        // Create a default category if none exists
        Category category = null;
        if (categoryRepository.count() == 0) {
            category = Category.builder()
                    .name("General")
                    .description("General Support Category")
                    .build();
            category = categoryRepository.save(category);
            log.info("Created default Category 'General'");
        } else {
            category = categoryRepository.findAll().get(0);
        }

        // Create Admin
        if (!userRepository.existsByEmail("admin@helpdesk.com")) {
            User admin = User.builder()
                    .name("Admin User")
                    .email("admin@helpdesk.com")
                    .password(passwordEncoder.encode("12345678"))
                    .role(Role.ADMIN)
                    .isActive(true)
                    .build();
            userRepository.save(admin);
            log.info("Admin user 'admin@helpdesk.com' created successfully with password '12345678'.");
        }

        // Create Agent
        if (!userRepository.existsByEmail("agent@helpdesk.com")) {
            User agent = User.builder()
                    .name("Agent User")
                    .email("agent@helpdesk.com")
                    .password(passwordEncoder.encode("12345678"))
                    .role(Role.AGENT)
                    .category(category)
                    .isActive(true)
                    .build();
            userRepository.save(agent);
            log.info("Agent user 'agent@helpdesk.com' created successfully with password '12345678'.");
        }
    }
}
