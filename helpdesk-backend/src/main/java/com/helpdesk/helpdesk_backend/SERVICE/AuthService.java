package com.helpdesk.helpdesk_backend.SERVICE;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.helpdesk.helpdesk_backend.DTO.REQUEST.LoginRequest;
import com.helpdesk.helpdesk_backend.DTO.REQUEST.RegisterRequest;
import com.helpdesk.helpdesk_backend.DTO.RESPONSE.AuthResponse;
import com.helpdesk.helpdesk_backend.ENTITY.User;
import com.helpdesk.helpdesk_backend.ENUM.Role;
import com.helpdesk.helpdesk_backend.EXCEPTION.ConflictException;
import com.helpdesk.helpdesk_backend.EXCEPTION.NotFoundException;
import com.helpdesk.helpdesk_backend.REPOSITORY.UserRepository;
import com.helpdesk.helpdesk_backend.SECURITY.JwtUtil;

import lombok.RequiredArgsConstructor;
import java.util.Objects;

@Service
@RequiredArgsConstructor

public class AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthResponse register(RegisterRequest request){
        if(userRepository.existsByEmail(request.getEmail())){
            throw new ConflictException("Email already in use");
        }

        User user = User.builder()
            .name(request.getName())
            .email(request.getEmail())
            .password(passwordEncoder.encode(request.getPassword()))
            .role(Role.USER)
            .build();
        userRepository.save(Objects.requireNonNull(user));
        String token =jwtUtil.generateToken(user);
        return new AuthResponse(token,user.getRole().name(),user.getName(),user.getId());
    }

    public AuthResponse login(LoginRequest request){
        authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(),request.getPassword())
        );

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new NotFoundException("User not found"));
        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token,user.getRole().name(),user.getName(),user.getId());
    }
}
