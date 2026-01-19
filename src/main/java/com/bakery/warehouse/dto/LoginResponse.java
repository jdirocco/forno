package com.bakery.warehouse.dto;

import lombok.Data;

@Data
public class LoginResponse {
    private String token;
    private String username;
    private String fullName;
    private String role;
}
