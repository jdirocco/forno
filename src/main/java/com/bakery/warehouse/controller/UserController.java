package com.bakery.warehouse.controller;

import com.bakery.warehouse.entity.Shop;
import com.bakery.warehouse.entity.User;
import com.bakery.warehouse.repository.ShopRepository;
import com.bakery.warehouse.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final ShopRepository shopRepository;
    private final PasswordEncoder passwordEncoder;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/drivers")
    @PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
    public ResponseEntity<List<User>> getActiveDrivers() {
        List<User> drivers = userRepository.findByRole(User.UserRole.DRIVER)
                .stream()
                .filter(User::getActive)
                .toList();
        return ResponseEntity.ok(drivers);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> getUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(user);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> createUser(@RequestBody Map<String, Object> userRequest) {
        // Check if username already exists
        String username = (String) userRequest.get("username");
        if (userRepository.findByUsername(username).isPresent()) {
            throw new RuntimeException("Username already exists");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode((String) userRequest.get("password")));
        user.setFullName((String) userRequest.get("fullName"));
        user.setEmail((String) userRequest.get("email"));
        user.setPhone((String) userRequest.get("phone"));
        user.setWhatsappNumber((String) userRequest.get("whatsappNumber"));
        user.setRole(User.UserRole.valueOf((String) userRequest.get("role")));
        user.setActive((Boolean) userRequest.getOrDefault("active", true));
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());

        // Set shop if provided (for SHOP role)
        if (userRequest.containsKey("shopId") && userRequest.get("shopId") != null) {
            Long shopId = ((Number) userRequest.get("shopId")).longValue();
            Shop shop = shopRepository.findById(shopId)
                    .orElseThrow(() -> new RuntimeException("Shop not found"));
            user.setShop(shop);
        }

        User saved = userRepository.save(user);
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> userRequest) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setFullName((String) userRequest.get("fullName"));
        user.setEmail((String) userRequest.get("email"));
        user.setPhone((String) userRequest.get("phone"));
        user.setWhatsappNumber((String) userRequest.get("whatsappNumber"));
        user.setRole(User.UserRole.valueOf((String) userRequest.get("role")));
        user.setActive((Boolean) userRequest.get("active"));

        // Only update password if provided
        if (userRequest.containsKey("password") && userRequest.get("password") != null) {
            String password = (String) userRequest.get("password");
            if (!password.isEmpty()) {
                user.setPassword(passwordEncoder.encode(password));
            }
        }

        // Update shop if provided (for SHOP role)
        if (userRequest.containsKey("shopId")) {
            if (userRequest.get("shopId") != null) {
                Long shopId = ((Number) userRequest.get("shopId")).longValue();
                Shop shop = shopRepository.findById(shopId)
                        .orElseThrow(() -> new RuntimeException("Shop not found"));
                user.setShop(shop);
            } else {
                user.setShop(null); // Remove shop association
            }
        }

        user.setUpdatedAt(LocalDateTime.now());

        User updated = userRepository.save(user);
        return ResponseEntity.ok(updated);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<User> toggleUserActive(@PathVariable Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setActive(!user.getActive());
        user.setUpdatedAt(LocalDateTime.now());

        User updated = userRepository.save(user);
        return ResponseEntity.ok(updated);
    }
}
