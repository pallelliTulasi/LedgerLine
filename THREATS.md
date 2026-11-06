# 🛡️ My Security Diary (THREATS.md)

Building this app today made me realize how hard it is to maintain security when moving from localhost to the public internet. Here are the real threats I dealt with, and why my deployment is currently unfinished.

## 1. The "Network Error" & CORS Nightmare (Why it's not live)
* **The issue:** When I tried to connect my deployed React frontend to my backend, nothing loaded. I checked the browser console and saw a massive `AxiosError: Network Error` caused by CORS. A quick AI search told me to just add `@CrossOrigin("*")` to fix it instantly.
* **What I did:** I realized that using `*` means literally any website can make API calls to my backend. I refused to compromise my app's security just to get rid of the network error for the demo. Because I couldn't figure out the exact secure Render-to-Render configuration in time, I chose to keep the app secure and running locally rather than deploying a vulnerable API.

## 2. Almost leaking my database password
* **The issue:** During my deployment attempts, I initially thought of putting the `spring.datasource.url` and password directly in `application.properties`.
* **What I did:** I realized pushing that to a GitHub repo is a huge security risk. Even though my deployment failed, I successfully configured my code to use environment variables (`${DB_URL}`, `${DB_USERNAME}`) to ensure secrets are never hardcoded.

## 3. Fake "From Account" transfers (Local fix)
* **The issue:** Even locally, my JSON transfer request looks like `{ "fromAccount": 1, "toAccount": 2, "amount": 100 }`. If someone bypasses my React UI and uses a tool like Postman, they could change `fromAccount` to someone else's ID.
* **What I did:** I made sure the backend never trusts the client. It completely ignores the `fromAccount` field in the request body. Instead, it securely extracts the real user's ID directly from their authenticated JWT token. 

## 4. Basic Input Injections
* **The issue:** The risk of people typing SQL commands in the amount field, or putting `<script>` tags in their account names.
* **What I did:** I relied on my frameworks. Spring Data JPA uses prepared statements (preventing SQL injection), and React automatically escapes text before rendering it to the screen (preventing XSS).
