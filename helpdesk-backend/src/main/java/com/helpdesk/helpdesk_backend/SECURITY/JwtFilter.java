package com.helpdesk.helpdesk_backend.SECURITY;

import java.io.IOException;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.lang.NonNull;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;
    private final UserDetailsService userDetailsService;

    public JwtFilter(JwtUtil jwtUtil, UserDetailsService userDetailsService) {
        this.jwtUtil = jwtUtil;
        this.userDetailsService = userDetailsService;
        
    }
    
    @Override
    protected void doFilterInternal(
        @NonNull HttpServletRequest request,
        @NonNull HttpServletResponse response,
        @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
            String authHeader = request.getHeader("Authorization");
            try {
                if(authHeader == null || !authHeader.startsWith("Bearer ")){
                    filterChain.doFilter(request, response);
                    return; 
                }
                String token = authHeader.substring(7);
                String email = jwtUtil.extractEmail(token);

                if(email != null && SecurityContextHolder.getContext().getAuthentication() == null){
                    UserDetails user = userDetailsService.loadUserByUsername(email);
                    if(jwtUtil.isValid(token,user)){
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(user,null,
                            user.getAuthorities()
                        );
                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                    
                }
            } catch (Exception e) {
                // Token is invalid or missing — skip authentication
                // Spring Security will deny access if needed
            }
            filterChain.doFilter(request, response);

        }
    

    
}
