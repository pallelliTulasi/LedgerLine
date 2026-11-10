# AI Prompts & Development Journey

Here is how I used AI to speed up my development while making sure the logic and security were actually correct.

## Entry 1: November 6, 2026 - JWT Security Setup
- **What I asked for:** "Write a Spring Security config with JWT for a Spring Boot 3 app."
- **What the tool produced:** It gave me an old `WebSecurityConfigurerAdapter` class and hardcoded the secret key right there in the Java file.
- **What was wrong with it:** `WebSecurityConfigurerAdapter` is deprecated in Spring Boot 3 so it wouldn't even compile. Also, hardcoding passwords/secrets is a huge security risk.
- **What I did instead:** I rewrote the config using the new `SecurityFilterChain` approach and moved my JWT secret into `application.properties` to read from environment variables.
- **Commit Link:** https://github.com/pallelliTulasi/LedgerLine/commit/YOUR_COMMIT_ID

## Entry 2: November 6, 2026 - Transaction Audit Trail
- **What I asked for:** "How to transfer money between accounts and keep a history log."
- **What the tool produced:** It wrote the logic to update the balance and just used `System.out.println()` to log the transaction.
- **What was wrong with it:** Printing to the console isn't an audit trail. If the app restarts, the history is completely gone.
- **What I did instead:** I manually created a `Transaction` entity class and a repository so that every transfer is permanently saved into the PostgreSQL database.
- **Commit Link:** https://github.com/pallelliTulasi/LedgerLine/commit/YOUR_COMMIT_ID

## Entry 3: November 6, 2026 - Fixing CORS Error
- **What I asked for:** "React is giving a CORS Network Error when calling my Spring Boot API. How to fix it?"
- **What the tool produced:** It told me to just add `@CrossOrigin` on top of my controller classes.
- **What was wrong with it:** Because I am using Spring Security, the security filter was blocking the request before it even reached my controller, so `@CrossOrigin` didn't work.
- **What I did instead:** I added a `CorsConfigurationSource` bean directly in my Spring Security config file to handle CORS at the filter level.
- **Commit Link:** https://github.com/pallelliTulasi/LedgerLine/commit/YOUR_COMMIT_ID

## Entry 4: November 6, 2026 - Database Credentials
- **What I asked for:** "Give me the application.properties config for Render PostgreSQL."
- **What the tool produced:** It gave me the file with my database URL, username, and password written in plain text.
- **What was wrong with it:** Pushing plain text database passwords to a GitHub repo (even a private one) is a bad security practice.
- **What I did instead:** I used variables like `${DB_URL}` and `${DB_USERNAME}` in my code, and securely set the actual values in the Render dashboard environment variables.
- **Commit Link:** https://github.com/pallelliTulasi/LedgerLine/commit/YOUR_COMMIT_ID

## Entry 5: November 6, 2026 - Updating React UI
- **What I asked for:** "How to update the React page after a successful money transfer."
- **What the tool produced:** It suggested using `window.location.reload()` to refresh the whole page.
- **What was wrong with it:** Reloading the page ruins the React single-page application (SPA) experience and looks glitchy.
- **What I did instead:** I used Axios and state variables (`useState`). After the transfer succeeds, I just call my `checkBalance()` function again to update the UI smoothly without reloading.
- **Commit Link:** https://github.com/pallelliTulasi/LedgerLine/commit/YOUR_COMMIT_ID
