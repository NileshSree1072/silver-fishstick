# Aegis Helpdesk - Project Setup & Execution Guide

Welcome to **Aegis Helpdesk**, an enterprise-ready, AI-augmented, event-driven ticketing support system. This document provides step-by-step instructions to configure, initialize, and execute the backend and frontend components on your system.

---

## 🏗️ 1. Architecture & Technology Stack

The project follows a decoupled client-server architecture consisting of three main modules:
1. **`helpdesk-backend`**: A Spring Boot REST and WebSockets API leveraging JPA, Flyway migrations, and PostgreSQL. It incorporates AI capabilities using Groq LLM and Azure OpenAI/Standard OpenAI embeddings.
2. **`helpdesk-react-frontend`**: A modern dashboard built using React, Vite, and Tailwind CSS.
3. **`mock-ui`**: A standalone vanilla JS prototype that functions completely client-side (using localStorage mock databases). Useful for quick sandbox demonstrations.
4. **`sample-ui`**: A repository of the static design slices and prototype UI screenshots/assets for developer reference.

---

## 🗄️ 2. Prerequisites & Database Setup

Before running the application, ensure your system has:
* **Java 17 JDK** (e.g. Eclipse Temurin or OpenJDK 17)
* **Node.js** (v18.0.0 or higher)
* **PostgreSQL** (v15.0 or higher) with the **`pgvector`** extension installed on the database server.

### Database Initialization Steps:
1. Open your PostgreSQL command line client or pgAdmin.
2. Create the target database:
   ```sql
   CREATE DATABASE helpdesk;
   ```
3. Connect to the database and verify that you have rights to install extensions. (The backend Flyway migrations will run `CREATE EXTENSION IF NOT EXISTS vector;` automatically on startup, but you must ensure your database engine has the physical pgvector files in its library path).
4. Configure database connection parameters in the `.env` file (see the next section).

> [!NOTE]
> If you are using a standard PostgreSQL setup, the port will likely be `5432`. Ensure you update this in configuration if your PostgreSQL is not running on port `5433`.

---

## ⚙️ 3. Backend Configuration (`.env`)

The backend reads configuration settings from a `.env` file located in the root of the `helpdesk-backend` directory.

Copy the `.env.example` file to `.env` and configure the values:

```bash
# Navigate to the backend directory
cd helpdesk-backend
copy .env.example .env
```

### Key Environment Variables Explained:
* **`DB_URL`**: The JDBC connection string for your main PostgreSQL database (defaults to `jdbc:postgresql://localhost:5432/helpdesk?options=-c%20TimeZone=UTC`).
* **`DB_USERNAME`** and **`DB_PASSWORD`**: Your local PostgreSQL database username and password (defaults to `postgres` and `1234`).
* **`DB_TEST_URL`**, **`DB_TEST_USERNAME`**, and **`DB_TEST_PASSWORD`**: (Optional) Connection parameters for the test database (defaults to port `5432`, database `helpdesk_test`). These are used when executing the JUnit test suite.
* **`JWT_SECRET`**: A 256-bit Base64 security string used to sign user session tokens.
* **`GROQ_API_KEY`**: (Required for AI features) Used to call the Groq LLM (e.g. `llama-3.3-70b-versatile`) for chat completions, ticket summaries, drafting replies, and knowledge base generation. Get a free API key at [console.groq.com](https://console.groq.com/).

### Swapping Services & Local Fallbacks:

#### A. File Storage (Azure Blob Storage vs Local Fallback)
* By default, the application is ready to upload ticket attachments to Azure Blob Storage if the connection string is provided.
* **To use Local Storage:** Simply leave `AZURE_STORAGE_CONNECTION_STRING` blank or delete the line in your `.env`.
* **Behavior:** The application will log a warning and automatically fall back to saving attachments inside the local project folder (`/uploads/`). The backend is pre-configured to serve these files publicly on port `8080`.

#### B. Text Embeddings (Azure OpenAI vs Standard OpenAI vs Mock fallback)
Text embeddings are critical for duplicate ticket detection and semantic knowledge base searches. We support three tiers depending on your API keys:
1. **Azure OpenAI (Tier 1):** Provide `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`, `AZURE_OPENAI_EMBEDDING_DEPLOYMENT`, and `AZURE_OPENAI_API_VERSION`.
2. **Standard OpenAI (Tier 2):** If Azure OpenAI credentials are blank, provide standard `OPENAI_API_KEY` (e.g., `sk-proj-...`) in `.env`. The app will query standard OpenAI's `/embeddings` endpoint using `text-embedding-3-small`.
3. **Deterministic Mock Embeddings (Tier 3 - Offline/Free Dev Fallback):** If neither Azure nor Standard OpenAI keys are supplied, the app will log a warning and use a **local mathematical mock generator**. It produces a 1536-dimensional unit vector seeded with the hash of the text input. This allows the backend to compile, execute database actions, and run ticketing flows flawlessly without any paid AI subscriptions!

#### C. System Emails
* The transactional notifications use SMTP configuration. By default, it is configured to use Gmail's SMTP service. You can adjust the parameters in `application.properties` (`spring.mail.*`) or disable/ignore them.

---

## 🚀 4. How to Run the Backend

1. Open a terminal inside the `helpdesk-backend` directory.
2. Compile and run the application using the Maven wrapper:
   - **Windows:**
     ```powershell
     .\mvnw.cmd spring-boot:run
     ```
   - **macOS / Linux:**
     ```bash
     ./mvnw spring-boot:run
     ```
3. The server will start, run Flyway schema migrations, and listen on **`http://localhost:8080`**.

---

## 💻 5. How to Run the React Frontend

1. Open a terminal inside the `helpdesk-react-frontend` directory.
2. Install the package dependencies:
   ```bash
   npm install
   ```
3. Launch the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your web browser and navigate to the address shown in the console (usually **`http://localhost:5173`**).
5. **Proxy Configuration:** Vite is configured via `vite.config.js` to automatically forward all `/api`, `/ws`, and `/uploads` requests to the backend server running at `http://localhost:8080`. You do not need to configure CORS.

---

## 🎨 6. How to Run the Vanilla Prototype (`mock-ui`)

If you want to quickly test the user interface flows without setting up PostgreSQL, Java, or Node:
1. Navigate to the **`mock-ui`** directory.
2. Double-click the **`index.html`** file to open it directly in any modern web browser.
3. This interface runs entirely client-side, using browser `localStorage` to simulate database records, ticket creation, agent replies, and AI auto-deflections.

---

## 👥 7. Login Credentials (Default Seed Data)

When the backend launches for the first time, it automatically seeds the database with test accounts. Use these to log in and inspect different user workspace perspectives:

| Role | Username / Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **User (Customer)** | `nilesh@helpdesk.com` | `password123` | Can submit tickets, view tickets, rate resolved tickets, search KB |
| **Agent** | `sarah@helpdesk.com` | `password123` | Receives auto-assigned tickets, can use AI copilot, draft replies |
| **Admin** | `admin@helpdesk.com` | `password123` | Can manage categories, create agents, view metrics & analytics |

---

## 🛠️ 8. Troubleshooting

* **Timezone Conflict:** If Postgres logs a fatal error regarding timezone `Asia/Calcutta`, ensure your local timezone options in the datasource URL are adjusted or aligned with your PostgreSQL server locale (e.g. UTC, IST, or Asia/Kolkata).
* **Database Driver Error:** Ensure your database service is running and accessible on the specified port.
* **401 Unauthorized Errors:** User sessions expire based on `app.jwt.expiration`. Clear local storage or log out and log back in to get a fresh token.
