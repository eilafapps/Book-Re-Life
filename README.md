# Book Re-Life: Inventory & POS

This document provides instructions for setting up and running the Book Re-Life application locally for development and production.

## 1. Architecture

The application is a full-stack system composed of:

- **Frontend**: A React single-page application built with Vite, TypeScript, and Tailwind CSS. It is located in the `/frontend` directory.
- **Backend**: A Node.js API built with Fastify, TypeScript, and Prisma ORM for database interactions. It is located in the `/backend` directory.
- **Database**: A PostgreSQL database to persist all application data.

## 2. Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js**: Version 18.x or later.
- **npm**: Version 7.x or later (which supports npm workspaces).
- **PostgreSQL**: A running instance of PostgreSQL 15. You can install it locally or use a cloud service.

## 3. Local Development Setup

Follow these steps to get the application running on your local machine.

### Step 1: Clone the Repository
```bash
git clone <your-repo-url>
cd book-re-life
```

### Step 2: Install Dependencies
Install all dependencies for the root, frontend, and backend workspaces from the root directory.
```bash
npm install
```
This command will also automatically run `prisma generate` to create the Prisma Client.

### Step 3: Configure Backend
1.  Navigate to the backend directory: `cd backend`
2.  Create a `.env` file by copying the example: `cp .env.example .env`
3.  Edit the `backend/.env` file with your configuration:
    - **`DATABASE_URL`**: Your PostgreSQL connection string.
      *Example: `DATABASE_URL="postgresql://user:password@localhost:5432/bookreflife?schema=public"`*
    - **`API_PORT`**: The port for the backend server (e.g., `3001`).
    - **`JWT_SECRET`**: A long, random, secret string for signing authentication tokens.

### Step 4: Configure Frontend
1.  Navigate to the frontend directory: `cd frontend` (from root)
2.  Create a `.env` file: `touch .env`
3.  Add the following line to `frontend/.env`, pointing to your running backend API. Make sure the port matches the `API_PORT` in the backend's `.env`.
    ```
    VITE_API_BASE_URL=http://localhost:3001
    ```

### Step 5: Set Up the Database
From the `backend` directory, run the following commands to apply the database schema and add initial seed data.
```bash
# Apply database migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed
```

## 4. Running the Application

Once setup is complete, you can start both the frontend and backend servers concurrently from the root directory.

```bash
npm run dev
```

This command will:
- Start the backend API (e.g., at `http://localhost:3001`).
- Start the frontend Vite development server (e.g., at `http://localhost:5173`).

You can now access the application by opening your browser to the frontend URL provided in your terminal.

## 5. Building for Production

To create a production-ready build of the application:

1.  **Build both projects**: From the root directory, run:
    ```bash
    npm run build
    ```
    - The optimized frontend assets will be placed in `frontend/dist`.
    - The compiled backend code will be placed in `backend/dist`.

2.  **Run the Backend**: From the root directory, start the production backend server:
    ```bash
    npm run start
    ```

3.  **Serve the Frontend**: The `frontend/dist` directory contains static files. You can serve them with any static file server like `serve`:
    ```bash
    # Install serve globally if you haven't already
    npm install -g serve

    # Serve the frontend build
    serve -s frontend/dist
    ```
