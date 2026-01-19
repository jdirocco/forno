package com.bakery.warehouse.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/test")
public class TestController {

    @GetMapping("/hello")
    public ResponseEntity<Map<String, Object>> hello() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Hello World");
        response.put("authenticated", auth != null && auth.isAuthenticated());
        if (auth != null) {
            response.put("principal", auth.getName());
            response.put("authorities", auth.getAuthorities().stream()
                    .map(a -> a.getAuthority()).toList());
        }
        return ResponseEntity.ok(response);
    }
}
