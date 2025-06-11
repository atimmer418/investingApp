// src/main/java/com/investingapp/backend/model/User.java
package com.investingapp.backend.model; // Make sure this package name matches your structure

import jakarta.persistence.*; // For JPA annotations (javax.persistence.* if using older Spring Boot/Jakarta EE)
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Entity // Marks this class as a JPA entity (a table in the database)
@Table(name = "user")
@Data // Lombok: automatically generates getters, setters, toString, equals, hashCode
@NoArgsConstructor // Lombok: generates a no-argument constructor (needed by JPA)
public class User {

    @Id // Marks this field as the primary key
    @GeneratedValue(strategy = GenerationType.IDENTITY) // Auto-incrementing ID for MySQL
    private Long id;

    @NotBlank(message = "First name cannot be blank")
    @Size(max = 50)
    private String firstName;

    @NotBlank(message = "Last name cannot be blank")
    @Size(max = 50)
    private String lastName;

    @Size(max = 50)
    private String userName;

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Email should be valid")
    @Size(max = 100)
    @Column(unique = true, nullable = false) // Ensure email is unique and not null at DB level
    private String email;

    @NotBlank(message = "Password cannot be blank")
    // Store HASHED password, so max size should be generous for different hashing algorithms
    @Size(max = 100) // BCrypt hashes are typically 60 chars, but good to have some buffer
    private String password; // This will store the HASHED password

    private String phoneNumber;

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

    private boolean twoFactorEnabled;
    private String twoFactorOtp;
    private LocalDateTime twoFactorOtpExpiry;

    @CreationTimestamp // Automatically set by Hibernate on creation
    private LocalDateTime createDate;

    @UpdateTimestamp // Automatically set by Hibernate on update
    private LocalDateTime updateDate;

    // You can add a constructor if needed, but Lombok's @Data and @NoArgsConstructor cover most needs.
    // If you need a constructor for specific fields (e.g., for testing or DTO mapping):
    public User(String firstName, String lastName, String email, String password) {
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.password = password; // Remember this will be the raw password initially
    }
}