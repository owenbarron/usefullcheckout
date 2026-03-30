# Appless Checkout Business Problem and Working Spec

**Date:** March 28, 2026

## Context

USEFULL needs an appless checkout system for campus deployments that preserves the core USEFULL model of assigning specific containers to specific users, communicating due dates and fees, and supporting returns and exceptions without forcing students to install or open the USEFULL mobile app.

The deployed prototype for this direction is the USEFULL checkout kiosk at:

[https://owenbarron.github.io/usefullcheckout/](https://owenbarron.github.io/usefullcheckout/)

That deployed system represents the intended interaction pattern: a tablet-based checkout flow that walks a student through scanning containers, identifying themselves, understanding the program, accepting terms if needed, and completing checkout. In the current implementation, that experience is expressed as a kiosk UI and workflow model. The broader business problem is how to connect that UX to real-world campus identity and payment infrastructure in a way that is scalable across different schools.

## Core Business Problem

USEFULL is trying to solve a campus adoption problem: students should be able to check out reusable containers quickly at the point of food purchase without app friction, while campuses and operators still get a system that is auditable, enforceable, and compatible with existing campus rules.

The challenge is that campuses do not all want the same thing:

- some want campus-card-based identification;
- some may want credit-card-based identification and fee backing;
- some may want mandatory participation with a narrow exception path;
- and some may have technical or policy constraints that limit what readers, APIs, or identity systems USEFULL can use.

So the real problem is not just "build a kiosk." The problem is to define a practical, repeatable hardware-plus-software architecture for appless checkout that can adapt to campus-specific identity methods without forcing USEFULL to reinvent its product or operational model for every client.

## What Must Stay True

Any solution should preserve the parts of the USEFULL system that matter commercially and operationally:

- USEFULL must continue to assign specific containers to specific users.
- USEFULL must support core workflows like checkout, return, due dates, fee communication, and notifications.
- USEFULL should avoid dependence on POS integration where campuses have exclusivity constraints or where integration would slow deployment.
- USEFULL should avoid creating a totally separate stack that duplicates existing backend and business logic.
- USEFULL must not directly process student credit cards.
- USEFULL should be able to support both first-time and returning users in a kiosk context.
- USEFULL must fit campus security, legal, and approval expectations.

## Northern Arizona University Path

For Northern Arizona University, the current working assumption is that the business problem can be solved through a non-credit-card, campus-credential-based kiosk flow using HID readers attached to Android tablets.

The expected NAU pattern is:

- the student scans USEFULL containers at the kiosk using a dual-purpose QR-code + NFC reader supplied by HID; the current device is a pre-production TripTick ATR-15 model;
- the student identifies themselves with a campus credential, likely using an HID reader that supports iClass SEOS;
- the kiosk resolves that identity through the school-compatible validation path;
- if the student is new to the appless flow, the kiosk presents the key checkout, return, and fee information plus Terms and Conditions;
- the kiosk completes the checkout in USEFULL's existing backend model;
- QR codes are used where helpful for terms review, app download, edge-case flows, or follow-up actions without making the mobile app mandatory.

In other words, for NAU the intended answer is not "invent a new app-free product from scratch." It is "turn the existing kiosk flow into a real deployed station by pairing Android tablets with HID readers that can work with NAU's credential system and support a practical iClass SEOS-based identification flow."

This NAU path is strengthened by the fact that HID is already a serious working partner rather than a hypothetical vendor. USEFULL has met several times with HID's development team to resolve blockers around HID-card integration. NAU is also an active partner in this process and has met jointly with USEFULL and HID. The expectation is that NAU will experiment alongside USEFULL by pre-programming HID devices with the mobile credentials required to read students' mobile SEOS IDs. That means the NAU deployment is not just a conceptual use case; it is a live partnership track that can validate whether the HID-based non-credit-card architecture is commercially real.

## UC Santa Cruz Open Question

USEFULL is also in conversation with UC Santa Cruz. At the moment, UC Santa Cruz has not said they require credit-card processing for appless checkout. The open question is different: whether their campus card system is compatible with the same HID reader strategy being considered for NAU.

That creates a broader research question for the business:

- can HID readers become the default workhorse hardware for the non-credit-card appless use case across multiple campuses; or
- will USEFULL need to use school-compatible readers on a per-client basis depending on each campus credential technology, provisioning model, and security policy?

This is strategically important. If HID readers can cover most non-credit-card campuses, USEFULL can standardize hardware, software behavior, deployment, and support. If not, the business may still be viable, but deployment becomes more services-heavy and potentially less scalable because each campus could require its own approved reader stack.

## CU Boulder Credit-Card-First Model

CU Boulder adds a second major branch to the problem. They want a similar appless checkout experience, but not based on a campus card. They want the system to solve for users whose primary credential is a credit card. The program would be used in food courts on campus and would be mandatory, with only narrow exceptions such as temporary guests.

Even though Boulder is credit-card first, the current understanding is that it should still behave more like a standard USEFULL flow than a pure one-time-visitor event flow. In other words, Boulder should not automatically be treated as a stadium-style "return before you leave" model. It is better understood as a campus deployment that happens to use credit cards rather than campus credentials as the primary checkout primitive.

The Boulder problem appears to have two distinct product paths:

### Path A: Account-Based

In the account-based model, the user is still fundamentally a USEFULL account holder. Their core identifier is email address or phone number. If the identifier is email, this looks very close to the current USEFULL model. In the Boulder credit-card-only version, the stored payment method would always be a credit card.

The intended flow would be:

- the user scans containers at the kiosk;
- the user enters their account identifier, which could be email or phone number;
- the system looks up the account;
- if this is the user's first time, they are prompted to tap their credit card;
- ideally, that credit card is then stored as the account's reusable payment method through a Stripe-compatible flow;
- the user takes the containers;
- if they do not return the containers within the standard two-day checkout window, the normal USEFULL fee logic applies: $1 on the first late day, $1 on the next, continued late-fee accrual, and then the remainder of the replacement fee until the total reaches $17 for a cup or $25 for a bowl;
- the user receives warnings by email and can contact support for waiver handling, just like a normal USEFULL account flow.

The account-based model also has two sub-variants for repeat checkout:

- ideal repeat flow: the user scans containers and then taps their card or phone, and the system recognizes the stored payment method, confirms it is still valid, and lets them proceed; in this version the card almost behaves like an ID card;
- fallback repeat flow: the user enters email or phone number, the account is found, and checkout proceeds from there.

This creates a major research question. Can USEFULL, without directly processing cards itself, create an account linked to a securely stored payment method and later look up or authenticate that account by card tap? If the answer is no, then the fallback becomes identifier-first lookup using email or phone number.

That fallback introduces a product-risk question: if a person can type someone else's email or phone number and trigger a checkout, then they may be exposing that account holder to unapproved charges. The research therefore needs to determine whether Boulder can safely rely on identifier-first lookup alone, or whether some additional possession-based proof is required at checkout.

### Path B: Accountless

In the accountless model, each checkout is tied to a specific card tap or swipe rather than to a long-lived stored payment method on a USEFULL account.

The intended flow would be:

- the user scans containers;
- the user taps or inserts a card, or uses a wallet tap;
- the checkout is tied to that one authorization event;
- the user still provides contact information so they can receive checkout and return notifications;
- USEFULL may still create a lightweight account or record tied to that contact info, but the important distinction is that there is not necessarily a living payment token stored for future reuse;
- whatever authorization the user gives is treated as specific to that checkout event.

This accountless path raises its own payments questions:

- can a single tap authorize a "dripfeed" fee model in which multiple $1 late fees and then a later larger remainder charge are all drawn from one initial authorization;
- if not, does the business need to simplify the promise to the user and say something closer to "return within X days or we will charge you $17" rather than attempting the current stepped fee logic;
- and can USEFULL look up a user's prior contact info from the card they used, so they do not have to re-enter email or phone number every time?

Systems like Square and Toast often appear able to associate card usage with customer records. A key research question is whether that capability exists for USEFULL through its integrations, or whether it is only practical for the processor/platform operating the payment environment itself.

### What Boulder Changes

The Boulder branch changes several things at once:

- USEFULL can no longer assume that campus-card lookup will provide identity data such as email.
- USEFULL still needs contactability for receipts, due dates, fee communications, support, and terms acceptance.
- USEFULL does not want to become a card processor or take on unnecessary PCI burden.
- USEFULL is already integrated with Stripe and would strongly prefer to keep using Stripe if possible.
- A campus HID reader by itself does not solve this use case.
- The feasibility of reusable card-linked identity without direct card processing is now a central research issue.

So the Boulder question is no longer just "can we take a card?" It is "which of these two models is actually viable without violating PCI boundaries, creating fraud or unauthorized-charge risk, or forcing USEFULL into payment behaviors that Stripe and the surrounding hardware ecosystem do not cleanly support?"

## Adjacent Use Case: Holy Cross / Stadium Environment

USEFULL is also exploring a partnership with Holy Cross in which containers would be provided at sports stadium concessions to attendees buying food from refreshment areas. This use case is adjacent rather than identical, but it is strategically relevant because it is also likely to be credit-card first.

In the ideal version of that flow, container checkout would be integrated into the stadium's point of sale system, Clover, so that an attendee could check out a container at the end of the food purchase flow, likely with an additional tap or confirmation step.

This could become an entirely separate system from the campus tablet kiosk. However, it creates a useful strategic question: if USEFULL does not get strong platform synergies from a Stripe-native payment device for the CU Boulder solution, and is already shopping for a PCI-compliant card insert / tap device, then USEFULL should at least consider whether a Clover-native or Clover-compatible hardware path could create reusable benefits across Boulder-like and stadium-like deployments.

The point is not that Holy Cross and Boulder are the same problem. They are not. The point is that both raise the broader question of which payment-hardware ecosystem USEFULL should align with when a deployment is credit-card first.

## Liability Model for One-Time Visitors

This section primarily applies to the Holy Cross stadium use case, not to CU Boulder.

Another important extension of this business problem is how USEFULL should translate its existing late-fee-then-lost-fee model into environments dominated by one-time or infrequent visitors rather than recurring on-campus users.

The traditional campus model assumes a user may be on or near campus regularly, may return within the normal rental window, and can be managed through ongoing account-based communication. In contrast, a visitor at a stadium or event venue may be expected to use the container on premises, return it before leaving, and then potentially not come back for a long time. That means the current rental-fee logic may not map cleanly to the actual risk profile or customer expectation.

USEFULL therefore needs to consider what the right financial and UX model is for these short-duration, credit-card-first use cases. Options to evaluate include:

- a pre-authorization only model, where the user taps a card and approves a temporary hold for a stated amount;
- a refundable upfront deposit model, such as charging $0.50 or $1.00 and refunding it upon return;
- a hybrid model, such as a small refundable upfront charge plus a later replacement-fee charge if the container is not returned;
- or a replacement-fee-only model triggered when return conditions are not met.

USEFULL's current fee logic is backend-driven: cron jobs evaluate active assignments, assess $1 per day in late fees after the due date, and then assess the remainder of the fee after roughly nine days of lateness. In a Holy Cross-style venue deployment, that logic would likely need a different timing profile. For example:

- if return is mandatory on exit, the system might wait roughly 24 hours after checkout before assessing the full non-return fee; or
- if attendees might reasonably take containers home and return them later, the system might wait closer to two days before assessing the full fee.

This is not just a payments question. It is also a customer-communication and conversion question. The kiosk or checkout flow may need to explain, in very few seconds, that the user is:

- tapping a credit card or wallet;
- authorizing a hold or small charge;
- agreeing to how and when that amount is released, refunded, or escalated; and
- understanding what happens if the container is not returned.

One specific idea worth evaluating is a "double charge" structure:

- charge a small deposit upfront, such as $0.50 or $1.00, which is refundable on return; and
- later charge the full replacement fee, such as $17 for a cup or $25 for a bowl, if the container is not returned.

That model may improve salience and accountability, but it also raises questions about customer comprehension, perceived fairness, charge disputes, operational complexity, and whether the small deposit meaningfully changes return behavior. It may be simpler or clearer in some environments to use a pre-authorization hold tied to the replacement-fee logic rather than a tiny refundable charge. The business problem is to determine which approach produces the best combination of return rates, customer trust, low dispute rates, and operational simplicity.

## Identity and Contactability Constraint

USEFULL also needs to account for the fact that, today, it primarily knows users by their email address, which is stored in Firebase. Email appears to be the only truly mandatory field for registration. Users can register directly with email and password, or through campus email, Google, or Apple authentication.

That means appless and credit-card-first flows create a new product requirement: USEFULL must either collect an email address during or after checkout, or change the core identity/contact model to use another durable identifier such as phone number. This is especially important for the Boulder account-based path, where phone number may become a practical alternative to email for account lookup, and for the accountless path, where USEFULL may still need to collect contact information even if the payment method is not stored as a reusable account token.

This choice has important downstream implications:

- receipts, due-date reminders, late-fee notices, and support communications all depend on it;
- guest and one-time-visitor flows may tolerate phone-number-first identity better than email-first identity;
- campus-card-based flows may still be able to source email from campus systems in some cases, but credit-card-first flows cannot assume that;
- and the current Firebase user model may need to evolve if email is no longer the only or primary identifier.

## Hybrid Option Should Stay Alive

USEFULL should not fully discard the idea of a hybrid system that combines:

- a credit-card or wallet terminal;
- an HID-based campus credential reader; and
- QR codes for auxiliary steps or exception handling.

That hybrid path may still be useful if:

- a campus wants both card-based identification and backup payment capture;
- a deployment needs guest handling or fallback flows;
- or a single kiosk needs to support multiple population types without forcing one enrollment model on everyone.

The key risk is complexity: more peripherals, more failure points, more enclosure design challenges, and a harder operational story. But if custom enclosures can make the setup clean and durable, the hybrid option could still become a legitimate product path rather than a messy one-off.

## The Strategic Research Question

The central question USEFULL needs to answer through deep research is:

Can USEFULL define a common tablet-kiosk architecture for appless checkout, while allowing the identity/input hardware layer to vary by campus when necessary?

More specifically:

1. Can HID readers serve as the general-purpose standard for the non-credit-card campus use case, especially for campuses like NAU and potentially UCSC?
2. If not, how often will USEFULL need campus-specific reader substitutions?
3. For credit-card-based campuses like Boulder, is the viable path account-based, accountless, or both?
4. Can Stripe-compatible payment hardware support either a reusable stored-payment-method model or a one-time authorization model cleanly without pulling USEFULL into payment-processing complexity?
5. Can USEFULL safely look up or authenticate an account from a tapped card without directly processing cards itself, or will repeat checkouts need to rely on email or phone lookup?
6. Can a single card authorization support a stepped or "dripfeed" fee model, or do credit-card-first deployments require a different fee design altogether?
7. Is there a credible hybrid configuration, supported by good industrial design and custom enclosures, that can combine HID, payment, and QR workflows without becoming too cumbersome to deploy?

## Working Business Framing

The business problem is to create an appless checkout product line, not just a single kiosk demo.

That product line likely needs:

- a common USEFULL checkout application and workflow layer;
- a campus-card branch for schools where campus credentials are the right identity primitive;
- a credit-card branch for schools where payment credentials are the right identity and liability primitive, potentially split between account-based and accountless models; and
- enough hardware flexibility to support standardization where possible and campus-specific accommodations where necessary.

Success would mean USEFULL can walk into a campus opportunity and say:

- here is the standard tablet-based kiosk experience;
- here is the reader and identity model that fits your school;
- here is how terms, due dates, fees, and notifications still work inside the USEFULL system; and
- here is how the deployment can be supported without requiring a native app from students.

**Signed,**

Codex
