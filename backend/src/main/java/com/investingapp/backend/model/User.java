// src/main/java/com/investingapp/backend/model/User.java
package com.investingapp.backend.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.HashSet; // Import HashSet
import java.util.Set;   // Import Set

@Entity
@Table(name = "users", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email")
})
@Data
@NoArgsConstructor
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // @NotBlank(message = "First name cannot be blank")
    @Size(max = 50)
    private String firstName; // Optional if you only want email initially

    // @NotBlank(message = "Last name cannot be blank")
    @Size(max = 50)
    private String lastName; // Optional

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    @Size(max = 100)
    @Column(unique = true, nullable = false)
    private String email; // Primary identifier

    // @NotBlank // No longer needed if no password
    // @Size(max = 100)
    // private String password; // REMOVE THIS FIELD

    // WebAuthn User Handle (can be same as ID or a separate UUID for privacy)
    // The Yubico library often uses a ByteArray for this. We can store it as a string.
    @Column(unique = true, length = 255) // Must be unique if used as user handle for WebAuthn
    private String userHandle; // Store as Base64URL encoded string

    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<PasskeyCredential> passkeyCredentials = new HashSet<>();

    // Plaid specific fields
    @Column(length = 255) // Adjust length as needed
    private String plaidAccessToken; // IMPORTANT: Encrypt this at rest!

    @Column(length = 255)
    private String plaidItemId;

    // Onboarding status flags
    private boolean initialSurveyCompleted = false;
    private boolean plaidLinked = false;
    private boolean investmentSurveyCompleted = false;
    private boolean choseToPickStocks = false;
    private boolean stockSelectionCompleted = false;
    private boolean investmentConfirmationCompleted = false;

    @CreationTimestamp // Automatically set by Hibernate on creation
    private LocalDateTime createDate;

    @UpdateTimestamp // Automatically set by Hibernate on update
    private LocalDateTime updateDate;

    public User(String email) { // Simplified constructor for passkey registration
        this.email = email;
        // Generate a user handle, e.g., from UUID or a transformation of the user ID after first save
        // For now, it can be set later or derived.
    }

    // public User(String firstName, String lastName, String email) {
    //      this.firstName = firstName;
    //      this.lastName = lastName;
    //      this.email = email;
    // }
}