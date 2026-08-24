package com.helpdesk.helpdesk_backend.SECURITY;

import org.springframework.stereotype.Component;

import com.helpdesk.helpdesk_backend.ENTITY.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

import java.util.Date;

import javax.crypto.SecretKey;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;


@Component
public class JwtUtil {
    @Value("${app.jwt.secret}")
    private String secret;

    @Value("${app.jwt.expiration}")
    private long expiration;

    public String generateToken(User user){
        
        return Jwts.builder()
            .subject(user.getEmail())
            .claim("role",user.getRole().name())
            .claim("userId",user.getId().toString())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis()+expiration))
            .signWith(getKey())
            .compact();
    }

    public String extractEmail(String token){
        return getClaims(token).getSubject();
    }

    public boolean isValid(String token,UserDetails user){
        return extractEmail(token).equals(user.getUsername()) && 
               !getClaims(token).getExpiration().before(new Date());
    }

    private Claims getClaims(String token){
        return Jwts.parser()
               .verifyWith(getKey()) 
               .build()
               .parseSignedClaims(token)
               .getPayload();
    }

    private SecretKey getKey(){
        
        return Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
    }

}
