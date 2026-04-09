## Flows

### Scan & Payment Selection

1. **Start Session / Scan Containers**  
   User arrives at the kiosk and sees "Scan your USEFULL containers."  
   They scan one or more reusable containers.  
   The kiosk shows a live count of scanned containers and a visible session timeout countdown.  
   After at least one container is scanned, the kiosk presents two payment zones: **Campus Card** (tap card or mobile ID on HID reader) or **Credit Card** (tap or insert at Stripe reader). The user can also keep scanning more containers.

### Campus Card Flows

2. **Successful Checkout — Campus Card (Returning User)**  
   1. After scanning at least 1 container, user taps campus ID/mobile ID on HID device.  
   2. Device reads card ID successfully.  
   3. App calls Touchnet API to retrieve student ID.  
   4. USEFULL calls internal API to lookup USEFULL account for given ID at given client.  
   5. USEFULL app recognizes registered user in good standing.  
   6. Checkout completes immediately. Success screen confirms number of containers checked out, return-by date (2 days from checkout), and container details.  
   7. Session auto-resets to the scan screen after a short confirmation window.

3. **Successful Checkout — Campus Card (First-Time User)**  
   1. After scanning at least 1 container, user taps campus ID/mobile ID on HID device.  
   2. Device reads card ID successfully.  
   3. App calls Touchnet API to retrieve student ID & info (name, email).  
   4. USEFULL calls internal API to lookup USEFULL account for given ID at given client.  
   5. USEFULL app reports student does NOT have USEFULL account.  
   6. USEFULL account created for user with Touchnet-provided name, email.  
      1. No login method set (maybe need to create new "badge scanner" auth method in Firebase for our logs?)  
   7. Kiosk welcomes user by name & shows a program overview (free period, late fee, loss policy, campus billing method) and requires consent.  
      1. If user clicks **Accept & Continue**, checkout completes immediately. Success screen confirms number of containers checked out, return-by date (2 days from checkout), and container details. System emails user.  
         1. Session auto-resets to the scan screen after a short confirmation window.  
      2. If user taps **Cancel**, session resets with no checkout.

### Credit Card Flows

4. **Successful Checkout — Credit Card (Returning User, Same Card)**  
   1. After scanning at least 1 container, user taps/inserts credit card or mobile wallet (Apple Pay, Google Pay) on Stripe reader.  
   2. Stripe reader reads card token successfully.  
   3. App matches the card token to a previously registered USEFULL account.  
   4. Checkout completes immediately. Success screen confirms number of containers checked out, return-by date (2 days from checkout), and container details.  
   5. Session auto-resets to the scan screen after a short confirmation window.

5. **Successful Checkout — Credit Card (New User)**  
   1. After scanning at least 1 container, user taps/inserts credit card on Stripe reader.  
   2. Stripe reader reads card token. No existing USEFULL account is associated with this card.  
   3. Kiosk prompts user to enter their phone number via on-screen keypad.  
   4. App performs account lookup using the phone number.  
   5. No existing account found. Kiosk shows program overview screen (2 days free, $1/day late fee, lost after 15 days with max charges, credit card billing — "Late or lost fees bill to [Brand] ***[Last4]") and requires consent.  
      1. If user taps **Accept & Continue**, kiosk sends an SMS verification code to the entered phone number.  
      2. User enters the 6-digit OTP code via on-screen keypad.  
      3. On successful verification, USEFULL account is created and linked to the card. Checkout completes. Success screen confirms containers, return-by date, and details.  
      4. Session auto-resets after a short confirmation window.  
      5. If user taps **Cancel** at any step, session resets with no checkout.

6. **Successful Checkout — Credit Card (Returning User, Same Underlying Card via Different Wallet)**  
   _Example: User originally registered with a physical Visa ending in 1234, now pays with Apple Pay backed by the same Visa._  
   1. After scanning at least 1 container, user taps mobile wallet on Stripe reader.  
   2. Stripe reader reads card token. Token doesn't exactly match, but the underlying card maps to an existing USEFULL account.  
   3. Kiosk prompts user to enter their phone number via on-screen keypad.  
   4. App performs account lookup → account found. Kiosk shows the user's name, masked phone number, and membership info with a **Continue as [Name]** button (plus a "Not you? Try a different number" link).  
   5. User confirms identity. Kiosk asks "Add this payment method?" showing the new card/wallet details, with a **Send Code** button.  
   6. SMS verification code sent. User enters the 6-digit OTP.  
   7. On successful verification, new wallet is linked to the existing account. Checkout completes with success screen.  
   8. Session auto-resets after a short confirmation window.

7. **Successful Checkout — Credit Card (Returning User, Different Card Entirely)**  
   _Example: User has an account linked to Visa ***1234 but pays with a completely different Mastercard._  
   1. After scanning at least 1 container, user taps/inserts a different credit card on Stripe reader.  
   2. Stripe reader reads card token. No match to any existing account.  
   3. Kiosk prompts user to enter their phone number via on-screen keypad.  
   4. App performs account lookup → account found. Kiosk shows the user's name and membership info with a **Continue as [Name]** button.  
   5. User confirms identity. Because the card doesn't match the payment method on file, the kiosk requires SMS verification to protect the account.  
   6. User enters the 6-digit OTP code.  
   7. After successful OTP, kiosk shows "Add this payment method?" with the new card details and a **Send Code** / confirmation step.  
   8. New card is linked to the existing account. Checkout completes with success screen.  
   9. Session auto-resets after a short confirmation window.

### Shared Flows

8. **Terms & Conditions Review**  
   1. During first-time onboarding (or from the scan screen), user can open Terms & Conditions.  
   2. They can switch between a summary and full legal terms, and optionally use QR code to read on phone.  
   3. Closing Terms returns them to their previous screen so they can accept or cancel checkout.

9. **Payment Tap Before Any Container Is Scanned**  
   1. If user taps campus ID or credit card before scanning a container, checkout does not proceed.  
   2. Kiosk shows inline guidance: "Scan containers first, then tap your card/ID."  
   3. User remains on the scan screen.

10. **Account Not Found (Campus Card)**  
    1. After valid container scan(s), campus ID tap fails because no campus-linked account is found.  
    2. Kiosk displays an error with support contact and a **Try Again** path.  
    3. Session auto-resets after a short delay if no action is taken.

11. **Account On Hold / Frozen**  
    1. After valid container scan(s), ID tap returns account-on-hold status (e.g., unpaid fees).  
    2. Kiosk shows hold message with support direction and a **Done** action.  
    3. Session auto-resets after a short delay if no action is taken.

12. **Session Timeout / Reset Rules**  
    1. If user starts scanning but does not finish checkout, session automatically resets after inactivity (15 seconds in current logic).  
    2. Any successful or failed terminal outcome also auto-resets after its confirmation/error window.  
    3. Reset clears scanned count, unlocks kiosk, and returns to initial scan screen for next user.
