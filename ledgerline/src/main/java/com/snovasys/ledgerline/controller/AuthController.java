package com.snovasys.ledgerline.controller;

import com.snovasys.ledgerline.entity.Role;
import com.snovasys.ledgerline.entity.User;
import com.snovasys.ledgerline.repository.UserRepository;
import com.snovasys.ledgerline.security.JwtService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Endpoints for user registration and JWT-based login (RBAC)")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          JwtService jwtService,
                          AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
    }

    public record RegisterRequest(
            @Schema(example = "user@balancevault.com", requiredMode = Schema.RequiredMode.REQUIRED)
            String email,
            @Schema(example = "password123", requiredMode = Schema.RequiredMode.REQUIRED)
            String password
    ) {}

    public record LoginRequest(
            @Schema(example = "admin@balancevault.com", requiredMode = Schema.RequiredMode.REQUIRED)
            String email,
            @Schema(example = "admin123", requiredMode = Schema.RequiredMode.REQUIRED)
            String password
    ) {}

    public record AuthResponse(String token, String email, String role) {}

    @Operation(summary = "Register New User", description = "Creates a new user account defaulting to ROLE_USER and generates an initial JWT token.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "User successfully registered with ROLE_USER"),
            @ApiResponse(responseCode = "400", description = "Invalid email/password or email already taken", content = @Content)
    })
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        if (request.email() == null || request.email().isBlank() || request.password() == null || request.password().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email and password are required."));
        }

        if (userRepository.existsByEmail(request.email())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered."));
        }

        // Default new signups to ROLE_USER
        User user = new User(request.email(), passwordEncoder.encode(request.password()), Role.ROLE_USER);
        userRepository.save(user);

        String token = jwtService.generateToken(user);
        return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getRole().name()));
    }

    @Operation(summary = "Authenticate & Obtain JWT Token", description = "Validates user credentials and issues a signed JWT token containing subject and role claims.")
    @ApiResponses(value = {
            @ApiResponse(responseCode = "200", description = "Authentication successful, JWT token returned"),
            @ApiResponse(responseCode = "401", description = "Unauthorized - Invalid email or password", content = @Content)
    })
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.email(), request.password())
            );

            User user = userRepository.findByEmail(request.email())
                    .orElseThrow(() -> new RuntimeException("User not found"));

            String token = jwtService.generateToken(user);
            return ResponseEntity.ok(new AuthResponse(token, user.getEmail(), user.getRole().name()));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid credentials"));
        }
    }
}
