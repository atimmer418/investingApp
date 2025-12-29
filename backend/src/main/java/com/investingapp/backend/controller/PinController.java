package com.investingapp.backend.controller;

import com.investingapp.backend.dto.PinRequest;
import com.investingapp.backend.dto.PinResponse;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.jwt.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@RestController
@RequestMapping("/api/user/pin")
public class PinController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 30;

    @PostMapping("/set")
    public ResponseEntity<PinResponse> setPin(@RequestHeader("Authorization") String token, @RequestBody PinRequest request) {
        User user = getUserFromToken(token);
        if (user == null) return ResponseEntity.status(401).build();

        if (request.getPin() == null || request.getPin().length() != 4 || !request.getPin().matches("\\d{4}")) {
            return ResponseEntity.badRequest().body(new PinResponse(false, "PIN must be 4 digits", false, 0L));
        }

        user.setPinHash(passwordEncoder.encode(request.getPin()));
        user.setFailedPinAttempts(0);
        user.setPinLockoutUntil(null);
        userRepository.save(user);

        return ResponseEntity.ok(new PinResponse(true, "PIN set successfully", false, 0L));
    }

    @PostMapping("/verify")
    public ResponseEntity<PinResponse> verifyPin(@RequestHeader("Authorization") String token, @RequestBody PinRequest request) {
        User user = getUserFromToken(token);
        if (user == null) return ResponseEntity.status(401).build();

        // Check Lockout
        if (user.getPinLockoutUntil() != null && user.getPinLockoutUntil().isAfter(LocalDateTime.now())) {
            long secondsLeft = ChronoUnit.SECONDS.between(LocalDateTime.now(), user.getPinLockoutUntil());
            return ResponseEntity.status(429).body(new PinResponse(false, "Account locked due to too many failed attempts", true, secondsLeft));
        }

        // Verify PIN
        if (passwordEncoder.matches(request.getPin(), user.getPinHash())) {
            // Success: Reset counters
            if (user.getFailedPinAttempts() > 0 || user.getPinLockoutUntil() != null || (user.getPinLockoutLevel() != null && user.getPinLockoutLevel() > 0)) {
                user.setFailedPinAttempts(0);
                user.setPinLockoutUntil(null);
                user.setPinLockoutLevel(0);
                userRepository.save(user);
            }
            return ResponseEntity.ok(new PinResponse(true, "PIN verified", false, 0L));
        } else {
            // Failure: Increment counter
            int attempts = user.getFailedPinAttempts() == null ? 0 : user.getFailedPinAttempts();
            attempts++;
            user.setFailedPinAttempts(attempts);

            if (attempts >= MAX_ATTEMPTS) {
                // Calculate lockout duration based on level
                int level = user.getPinLockoutLevel() == null ? 0 : user.getPinLockoutLevel();
                long lockoutMinutes = LOCKOUT_MINUTES * (long) Math.pow(2, level);
                
                user.setPinLockoutUntil(LocalDateTime.now().plusMinutes(lockoutMinutes));
                user.setPinLockoutLevel(level + 1);
                user.setFailedPinAttempts(0); // Reset attempts so they get 5 more tries AFTER lockout expires
                
                userRepository.save(user);
                return ResponseEntity.status(429).body(new PinResponse(false, "Too many failed attempts. Locked for " + lockoutMinutes + " minutes.", true, lockoutMinutes * 60));
            } else {
                userRepository.save(user);
                return ResponseEntity.status(401).body(new PinResponse(false, "Incorrect PIN. " + (MAX_ATTEMPTS - attempts) + " attempts remaining.", false, 0L));
            }
        }
    }
    
    @GetMapping("/status")
    public ResponseEntity<Boolean> hasPin(@RequestHeader("Authorization") String token) {
        User user = getUserFromToken(token);
        if (user == null) return ResponseEntity.status(401).build();
        return ResponseEntity.ok(user.getPinHash() != null && !user.getPinHash().isEmpty());
    }

    @GetMapping("/lockout-status")
    public ResponseEntity<PinResponse> checkLockout(@RequestHeader("Authorization") String token) {
        User user = getUserFromToken(token);
        if (user == null) return ResponseEntity.status(401).build();

        if (user.getPinLockoutUntil() != null && user.getPinLockoutUntil().isAfter(LocalDateTime.now())) {
            long secondsLeft = ChronoUnit.SECONDS.between(LocalDateTime.now(), user.getPinLockoutUntil());
            return ResponseEntity.ok(new PinResponse(false, "Account is locked", true, secondsLeft));
        }

        return ResponseEntity.ok(new PinResponse(true, "Account is active", false, 0L));
    }

    @DeleteMapping("/delete")
    public ResponseEntity<PinResponse> deletePin(@RequestHeader("Authorization") String token) {
        User user = getUserFromToken(token);
        if (user == null) return ResponseEntity.status(401).build();

        user.setPinHash(null);
        user.setFailedPinAttempts(0);
        user.setPinLockoutUntil(null);
        user.setPinLockoutLevel(0);
        userRepository.save(user);

        return ResponseEntity.ok(new PinResponse(true, "PIN removed successfully", false, 0L));
    }

    private User getUserFromToken(String token) {
        if (token != null && token.startsWith("Bearer ")) {
            token = token.substring(7);
        }
        String email = jwtUtils.getUserNameFromJwtToken(token);
        return userRepository.findByEmail(email).orElse(null);
    }
}
