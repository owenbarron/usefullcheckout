# USEFULL kiosk notification settings + Twilio SMS integration spec

Date: July 1, 2026  
Prototype files: `v4.html`, `core-v4.js`  
Reference screenshots:

- `screenshots/notification-settings-sms-only.png`
- `screenshots/notification-settings-changeable-sms.png`
- `screenshots/notification-settings-changeable-email.png`
- `screenshots/notification-settings-sms-disabled.png`

## Goal

Add a short notification-consent step to appless kiosk checkout so USEFULL can capture a usable contact path, show the user what phone number or email will receive checkout/return/billing notices, and stay aligned with Twilio SMS opt-in/opt-out requirements.

The app should treat phone number, authentication, and transactional notification consent as separate layers:

- Phone number can exist on an account before it is OTP-verified.
- SMS notifications require explicit transactional SMS consent.
- SMS opt-out state must be honored even when the phone number is still usable for non-SMS account matching or future OTP verification.

## Flow placement

### New credit-card checkout

Current prototype flow:

1. User taps credit card.
2. Stripe/card fingerprint is not recognized.
3. Kiosk asks for phone number.
4. Phone number is not recognized.
5. Show Notification Settings / Allow Notifications modal.
6. Continue to Program Overview.
7. User accepts program terms and completes checkout.

The modal lives after phone number entry/account lookup and before the program details/terms screen.

Important behavior:

- Do not block initial account creation on SMS OTP unless product leadership changes the checkout-speed requirement.
- If no OTP is performed, store the phone as unverified and do not use it as an ownership/authentication factor yet.
- Do use this screen to confirm the typed phone number and capture transactional notification consent.

### Returning user: SMS disabled edge case

New scenario:

1. User taps credit card.
2. Card fingerprint maps to an existing account.
3. USEFULL account shows SMS disabled / opted out.
4. Show SMS Disabled Notification Settings modal immediately after card tap.
5. User chooses email, or explicitly reselects SMS if re-enablement is supported.
6. Continue the returning-user checkout path.

This screen exists because returning users may still need checkout details, due dates, late fee notices, billing issues, and account status updates even after texting STOP.

## Modal variants

### Normal SMS-only flow

Use when the product does not allow immediate channel switching.

- Icon: message bubble, sky-blue background.
- Title: `Allow Notifications`
- Subheader: `We'll send you notifications for checkouts, returns, and other important info via SMS.`
- Phone row: show formatted phone number and an Edit affordance that returns to phone entry.
- No SMS/email selector.
- Legal copy: user explicitly agrees USEFULL may text rental, return, due-date, billing, and account status updates; include message/data rates and STOP language.
- CTA: `Agree and Continue`

### Changeable notification flow

Use when the product allows channel choice at checkout.

- Icon: message bubble, sky-blue background.
- Title: `Notification Settings`
- Subheader: `Choose how we send checkouts, returns, and other important info.`
- Selector: two-part toggle, not a card within a card.
  - Normal selected state: sky-blue background, white text.
  - Normal unselected state: white background, sky-blue text.
- If `Text me` is selected: show formatted phone row and SMS legal copy.
- If `Email me` is selected: show email input and email explanatory copy.
- CTA: `Continue`

### SMS disabled flow

Use when USEFULL believes the user has disabled SMS, either by app preference, inbound STOP/UNSUBSCRIBE/etc., Twilio opt-out state, or a Twilio 21610 send failure.

- Icon: message bubble, red background.
- Card border: red.
- Title: `Notification Settings`
- Subheader line 1, red: `You’ve disabled SMS notifications.`
- Subheader line 2, black: `Let us know how you prefer to get notifications for checkouts, returns, and other important info.`
- Selector: default to `Email me`.
  - Disabled-flow selected state: red background, white text.
  - Disabled-flow unselected state: white background, red text.
- Email input: pale red background.
- CTA: `Continue`

Product decision needed for re-enabling SMS:

- Safest approach: if the user selects `Text me` while Twilio/carrier opt-out is active, explain that they must text `START` or `UNSTOP` to USEFULL’s sender before SMS can resume.
- Do not assume the kiosk can override a carrier/Twilio STOP block. For U.S. toll-free numbers, Twilio documents special behavior: only START/UNSTOP fully undo blocking.

## Twilio integration requirements

### Recommended architecture

USEFULL’s database should be the application source of truth for notification eligibility. Twilio should be treated as the messaging provider and compliance signal source, not the only place where user preference lives.

Outbound send guard:

1. Resolve account/contact.
2. Check message type eligibility.
3. Check `sms_transactional_consent_at` exists for SMS.
4. Check `sms_opted_out_at` is null.
5. Check phone number is present and normalized to E.164.
6. Send through Twilio Messaging Service.
7. Record Twilio Message SID and delivery/status callbacks.

If the guard fails, send via email when a usable email/preference exists, otherwise record a notification delivery gap for ops/support follow-up.

### Inbound STOP/START/HELP handling

Configure inbound webhooks or Event Streams for the Messaging Service.

When Twilio sends an inbound message event:

- Match by normalized `from` number and Messaging Service/sender.
- If `OptOutType` is `STOP`, mark SMS disabled in USEFULL:
  - `sms_opted_out_at`
  - `sms_opt_out_source = twilio_inbound`
  - `sms_opt_out_keyword`
  - `twilio_message_sid`
  - `twilio_event_id` if using Event Streams
- If `OptOutType` is `START`, clear/reverse app opt-out only if product/legal agrees this is valid re-consent for the relevant transactional messages.
- If `OptOutType` is `HELP`, record event for audit/analytics; do not change opt-out state.

Twilio docs checked July 1, 2026:

- Inbound Messaging Events include `optOutType` with values like `START`, `STOP`, or `HELP`: https://www.twilio.com/docs/events/event-types/messaging/inbound-message
- Advanced Opt-Out sends `OptOutType` to the configured webhook and Twilio recommends storing it without sending another duplicate response: https://www.twilio.com/docs/messaging/tutorials/advanced-opt-out

### Twilio 21610 handling

If an outbound message fails with Twilio error `21610`, mark the phone as SMS disabled in USEFULL and route future transactional notices to email if available.

Twilio describes 21610 as an attempt to message a recipient who opted out by replying STOP, and says sending cannot resume until the recipient texts START or another supported opt-in keyword: https://www.twilio.com/docs/api/errors/21610

### Consent Management API investigation

Twilio’s Consent Management API is currently documented as globally available to Programmable Messaging customers, but docs also say access/pricing may require Twilio Support or sales enablement. Treat this as a short implementation investigation before ticket finalization.

If adopted, use it to sync opt-in/opt-out state between USEFULL and Twilio:

- Bulk upsert consent status via `POST https://accounts.twilio.com/v1/Consents/Bulk`.
- Store `contact_id` as E.164 phone number.
- Store `sender_id` as Messaging Service SID or sender.
- Use `status = opt-in` / `opt-out`.
- Use `source = website`, `offline`, `opt-in-message`, or `opt-out-message` as appropriate.
- Preserve USEFULL DB as the primary app decision point even when Twilio consent sync succeeds.

Current doc: https://www.twilio.com/docs/messaging/features/consent-api

## Data to persist

Minimum account/contact fields:

- `phone_number_e164`
- `phone_verified_at`
- `phone_verification_method`
- `email`
- `email_verified_at`
- `notification_channel_preference` (`sms`, `email`)
- `sms_transactional_consent_at`
- `sms_transactional_consent_source` (`kiosk_checkout`, `mobile_app`, `support`, etc.)
- `sms_transactional_consent_text_version`
- `sms_opted_out_at`
- `sms_opt_out_source`
- `sms_opt_out_keyword`
- `sms_reenabled_at`
- `twilio_messaging_service_sid`
- `last_twilio_message_sid`
- `last_twilio_error_code`

Audit table/event stream:

- consent captured
- consent text/version shown
- preference changed
- inbound STOP/START/HELP received
- Twilio 21610 received
- fallback email used

## Message types in scope

Support SMS/email routing for:

- one-time password
- welcome to USEFULL
- checkout notification
- return notification
- container due today
- container overdue
- late fee assessed
- lost fee assessed
- billing issue
- account frozen

OTP should remain logically separate from marketing/transactional lifecycle messaging. Firebase OTP remains admin-only per current product decision.

## SOC2 / security notes

- Validate Twilio webhook signatures before processing inbound events or status callbacks.
- Do not log full SMS bodies unnecessarily; redact phone numbers in logs where possible.
- Store consent and opt-out audit records immutably enough for compliance review.
- Update the data inventory for phone number, SMS consent state, notification preference, Twilio IDs, and message delivery events.
- Update subprocessors/vendor inventory if Twilio Messaging is newly in scope beyond SendGrid.
- Define retention for message metadata and bodies separately.

## Acceptance criteria

- New-card checkout shows the notification modal after phone entry and before program terms.
- User sees the phone number they typed before SMS consent is captured.
- SMS-only variant has message icon, no selector, and `Agree and Continue`.
- Changeable variant swaps the phone row for an email input when email is selected.
- SMS-disabled returning-user path shows the red warning variant immediately after card recognition and defaults to email.
- Outbound SMS is blocked when app DB says the user opted out.
- Inbound STOP/START/HELP updates app DB from Twilio webhook/Event Stream.
- Twilio 21610 marks the number SMS-disabled and triggers future email fallback where available.
- Consent and preference changes are audit logged with source and copy version.

## Open questions for the implementation ticket

- Will production launch with SMS-only or changeable notifications at first checkout?
- If SMS is disabled, can the kiosk offer SMS re-enable, or should it only tell users to text START/UNSTOP?
- Is Twilio Consent Management API enabled/priced for USEFULL’s Twilio account?
- Is the sender toll-free or A2P 10DLC at launch? Toll-free has special START/UNSTOP behavior.
- What exact consent copy version should Legal approve for the kiosk?
