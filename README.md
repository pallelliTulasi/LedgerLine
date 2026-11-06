# 🚀 LedgerLine

![LedgerLine Dashboard UI](Screenshot%202026-11-06%20144912.png)

LedgerLine is a modern, full-stack ledger and transaction management application. It provides a seamless interface for managing accounts, transferring funds, and tracking daily ledger entries with a robust backend architecture.

### 🌐 Live Demo & Deployment
- **Frontend Live (Render):** [https://ledgerline-app.onrender.com](https://ledgerline-app.onrender.com)
- **Backend API (Render):** [https://ledgerline-backend-i99t.onrender.com](https://ledgerline-backend-i99t.onrender.com)

## 🛠️ Tech Stack

### Frontend
- **Framework:** React.js with Vite
- **Styling:** Tailwind CSS
- **Deployment:** Render (Static Site)
- **HTTP Client:** Axios

### Backend & Database
- **Framework:** Spring Boot (Java)
- **Build Tool:** Maven
- **Database:** PostgreSQL
- **Deployment:** Render (Web Service)
- **Security:** CORS Enabled for seamless cross-origin requests

## 📁 Project Structure

This repository is organized as a monorepo containing both frontend and backend codebases:

- `/frontend` - Contains the React + Vite frontend application.
- `/ledgerline` - Contains the Spring Boot backend application.

## ✨ Key Features
- **Account Management:** Create and manage user accounts securely.
- **Fund Transfers:** Real-time money transfer between accounts.
- **Transaction History:** Instantly fetch current balance and track recent transactions.
- **Modern UI:** Fast, responsive, and intuitive user interface powered by Vite and Tailwind CSS.
- **Cloud Database Integration:** Fully integrated with a live PostgreSQL database for persistent data storage.

## 🚀 How to Run Locally

### 1. Backend Setup (Spring Boot)
Open your terminal and navigate to the backend directory:
```bash
cd ledgerline
