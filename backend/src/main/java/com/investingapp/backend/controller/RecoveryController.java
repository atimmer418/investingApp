package com.investingapp.backend.controller;

import com.investingapp.backend.dto.RecoveryInitiateRequest;
import com.investingapp.backend.dto.RecoveryResponse;
import com.investingapp.backend.dto.RecoveryVerifyRequest;
import com.investingapp.backend.model.User;
import com.investingapp.backend.repository.UserRepository;
import com.investingapp.backend.security.jwt.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Random;

@RestController
@RequestMapping("/api/auth/recovery")
public class RecoveryController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @PostMapping("/initiate")
    public ResponseEntity<RecoveryResponse> initiateRecovery(@RequestBody RecoveryInitiateRequest request) {
        // 1. Lookup User by SSN
        // In a real app, we would hash the input SSN and search for that hash
        User user = userRepository.findBySsn(request.getSsn()).orElse(null);

        if (user == null) {
            // Security: Return success even if user not found to prevent enumeration
            // But for this demo, we might want to be explicit or just delay
            try { Thread.sleep(1000); } catch (InterruptedException e) {}
            return ResponseEntity.ok(new RecoveryResponse(true, "If an account exists, a recovery code has been sent.", null));
        }

        // 2. Generate OTP
        String otp = String.format("%06d", new Random().nextInt(999999));
        user.setRecoveryOtp(otp);
        user.setRecoveryOtpExpiry(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        // 3. Mock Email Sending
        System.out.println("============================================");
        System.out.println("MOCK EMAIL TO: " + user.getEmail());
        System.out.println("SUBJECT: Account Recovery Code");
        System.out.println("BODY: Your recovery code is: " + otp);
        System.out.println("============================================");

        return ResponseEntity.ok(new RecoveryResponse(true, "If an account exists, a recovery code has been sent.", null));
    }

    @PostMapping("/verify")
    public ResponseEntity<RecoveryResponse> verifyRecovery(@RequestBody RecoveryVerifyRequest request) {
        User user = userRepository.findBySsn(request.getSsn()).orElse(null);

        if (user == null) {
            return ResponseEntity.status(401).body(new RecoveryResponse(false, "Invalid request", null));
        }

        // Check OTP
        if (user.getRecoveryOtp() == null || 
            !user.getRecoveryOtp().equals(request.getOtp()) || 
            user.getRecoveryOtpExpiry().isBefore(LocalDateTime.now())) {
            return ResponseEntity.status(401).body(new RecoveryResponse(false, "Invalid or expired code", null));
        }

        // Success!
        // 1. Clear OTP
        user.setRecoveryOtp(null);
        user.setRecoveryOtpExpiry(null);

        // 2. Security Purge: Delete all existing passkeys
        user.getPasskeyCredentials().clear();
        userRepository.save(user);

        // 3. Issue Token
        String token = jwtUtils.generateJwtTokenFromUsername(user.getEmail());

        return ResponseEntity.ok(new RecoveryResponse(true, "Recovery successful. Please register a new passkey.", token));
    }
}
