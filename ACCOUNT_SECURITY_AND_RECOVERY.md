# Account Security & Recovery Architecture

## Core Philosophy
This application uses a **Passkey-First** authentication model. 
- **Identity:** The user is identified by a unique ID in the database.
- **Authentication:** Primary access is granted via **WebAuthn Passkeys** (biometrics/device PIN).
- **Communication:** The **Email Address** serves as the persistent link between the human user and their digital account, primarily used for notifications and **Account Recovery**.

---

## 1. Login & Authentication
**Mechanism:** Usernameless (Discoverable) Passkeys.
- The user does *not* need to type their email to log in.
- The device (phone/laptop) holds the private key.
- The backend challenges the device, and the device signs the challenge.
- **Security Benefit:** Phishing resistant, no passwords to leak.

## 2. Step-up authentication (extra verification)

### What it is
An additional authentication step that can be enabled after you’re signed in.

### Triggered when an action is considered higher risk
*   Withdrawing funds.
*   Placing lump-sum trades.
*   Changing account settings (Email, Address).
*   Viewing full tax documents.

### iOS Behavior
On iOS, both can look identical (Face ID prompt), but the intent is different:
*   **Passkey auth** = “Who are you?”
*   **Step-up auth** = “Are you really you, right now, and do you mean to do this?”

That’s why you’ll sometimes see Face ID and then pin verification soon after.
### Lockout Policy
To prevent brute-force attacks, the system enforces a strict lockout mechanism:
*   **Attempt Limit:** 5 failed attempts allowed.
*   **Initial Lockout:** 30 minutes.
*   **Escalation:** Each subsequent lockout doubles in duration (30m → 1h → 2h → 4h...).
*   **Reset:** Successfully entering the correct PIN immediately resets the lockout level back to the initial 30 minutes and clears all failed attempts.
---

## 3. Session Management & App Lock
We balance security with user convenience using two distinct modes controlled by the **App Lock** setting.

### Core Concepts
*   **Inactivity:** Defined as a period with **no backend API requests**.
*   **Session Extension:** Every backend request resets the inactivity timer to 0.
*   **Token Refresh:** Every successful Passkey verification (unlock) generates a **fresh JWT Token**.

### A. App Lock: ON (High Security)
*   **Triggers:**
    1.  **Background → Foreground:** App immediately locks when brought to the foreground.
    2.  **Inactivity:** App locks if left open (foreground) for **1 Hour** without activity.
*   **Behavior:** User must authenticate with Passkey to unlock.
*   **Result:** A new JWT is issued upon unlock.

### B. App Lock: OFF (Standard Mode)
*   **Triggers:**
    1.  **Inactivity ONLY:** App locks *only* after **1 Hour** of inactivity (no backend requests), regardless of whether the app was in the background or foreground.
*   **Behavior:**
    *   If the user returns after < 1 hour: No prompt. Session continues.
    *   If the user returns after > 1 hour: App is locked. User must authenticate with Passkey.
*   **Result:** A new JWT is issued upon unlock.

---

## 4. Account Recovery Strategy
Since there are no passwords, "Forgot Password" does not exist. Instead, we use a **Device Loss Recovery Flow**.

### The Problem
If a user loses their device, they lose their private key (Passkey). They cannot log in.

### The Solution: Biometric Identity Verification (Persona + Email)
We use a "Defense in Depth" strategy. Access to the email inbox alone is **not sufficient** to recover the account. The user must prove their identity using **Biometric Verification** via our identity partner, **Persona**.

#### Recovery Workflow:
1.  **Initiation:**
    - User clicks **"Lost Device"** or **"Reset Passkey Access"** on the login screen.
    - **Identity Challenge:** The app launches a **Persona Inquiry** flow.
    
2.  **Biometric Scan (Face Match):**
    - **Liveness Detection:** The user is prompted to take a live selfie. Persona analyzes the video feed to ensure the user is a real person present at that moment (preventing spoofing with photos or screens).
    - **1:1 Match:** Persona compares the new biometric data against the original KYC identity profile established during sign-up to confirm it is the same person.
    - **Result:** Persona sends a secure webhook to our backend confirming the identity match.

3.  **Email Dispatch:**
    - Once identity is biometrically verified, the system sends a **One-Time Password (OTP)** or **Magic Link** to the *email address on file*.
    - *Note:* This ensures the user controls both the biological identity AND the communication channel.

4.  **Access Restoration & Security Reset:**
    - User clicks the link or enters the OTP.
    - **Automatic Security Purge:** Upon successful verification, the system **IMMEDIATELY DELETES ALL EXISTING PASSKEYS** associated with the account.
    - This ensures that if the old device was stolen, it is now useless for accessing the account.

5.  **Re-Enrollment (Mandatory):**
    - The user is placed in a restricted "Recovery Session".
    - The only allowed action is **Register New Passkey**.
    - Once the new passkey is created, full account access is restored.

---

## 5. Security Considerations
- **Biometric Privacy:** We do not store raw biometric data. All matching is handled securely by Persona.
- **Rate Limiting:** The recovery endpoint is strictly rate-limited.
- **Notification:** A security alert is sent to the email address notifying them that a recovery was initiated.
- **Mocking:** For development, the email sending service is mocked (logs the OTP to the console).
