# Book Re-Life: Inventory & POS

This document provides instructions for setting up and running the Book Re-Life application.

## 1. Architecture

The application is a full-stack system composed of:

- **Frontend**: A React single-page application built with Vite, TypeScript, and Tailwind CSS. It is located in the `/frontend` directory.
- **Backend**: A Node.js API built with Fastify, TypeScript, and Prisma ORM for database interactions. It is located in the `/backend` directory.
- **Database**: A PostgreSQL database to persist all application data.

## 2. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 18.x or later.
- **npm**: Version 7.x or later (which supports npm workspaces).
- **PostgreSQL**: A running instance of PostgreSQL 15.

## 3. Local Development Setup

Follow these steps to get the application running on your local machine.

### Step 1: Install Dependencies
From the project's root directory, run:
```bash
npm install
```
This command installs all dependencies and automatically generates the Prisma Client.

### Step 2: Configure Environment
1.  **Backend**: In the `/backend` directory, copy `.env.example` to a new file named `.env`.
    ```bash
    cp backend/.env.example backend/.env
    ```
    Update `backend/.env` with your PostgreSQL database URL and a secure `JWT_SECRET`.

2.  **Frontend**: Create a `.env` file in the `/frontend` directory.
    ```bash
    touch frontend/.env
    ```
    Add the following line, ensuring the port matches the `API_PORT` in the backend's `.env`.
    ```
    VITE_API_BASE_URL=http://localhost:3001
    ```

### Step 3: Set Up the Database
From the project's root directory, run the following commands to apply the database schema and add initial seed data.
```bash
# Apply database migrations
npm run migrate:dev --workspace=backend

# Seed the database with initial data
npm run seed --workspace=backend
```
*Note: The `seed` script is defined in `backend/package.json`.*

### Step 4: Run the Application
Start both the frontend and backend servers concurrently from the root directory.

```bash
npm run dev
```

- The backend API will start (e.g., at `http://localhost:3001`).
- The frontend Vite server will start (e.g., at `http://localhost:5173`).

## 4. Production Deployment

To build and run the application in a production environment:

### Step 1: Build the Application
From the root directory, run the build command:
```bash
npm run build
```
This command bundles the frontend for production (output in `frontend/dist`) and compiles the backend TypeScript code (output in `backend/dist`).

### Step 2: Run the Production Server
Ensure your production environment has the necessary environment variables set (especially `DATABASE_URL`, `JWT_SECRET`, and `NODE_ENV=production`).

From the root directory, start the optimized backend server:
```bash
npm run start
```
The backend server is pre-configured to serve the static frontend files from the `frontend/dist` directory, so you only need to run this single command. Access the application at the URL provided by the server (e.g., `http://localhost:3001`).
