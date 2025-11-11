
# Book Re-Life: Inventory & POS (Production)

This document outlines the architecture, deployment, and maintenance procedures for the production version of the Book Re-Life application.

## 1. Architecture & Changes

The application has been upgraded from a frontend-only prototype with a mock API to a full-stack, production-grade system.

### Tech Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS
- **Backend**: Node.js with Fastify + TypeScript + Prisma ORM + Zod
- **Database**: PostgreSQL 15
- **Deployment**: Docker Compose
- **Reverse Proxy**: Nginx (for TLS termination and routing)
- **Authentication**: JSON Web Tokens (JWT)

### Key Changes

1.  **Backend Service**: A new Node.js backend (in the `/backend` directory) has been created using Fastify. It handles all business logic, database interactions, and communication with external services (like the Gemini API).
2.  **Database**: All data is now persisted in a PostgreSQL database. The mock API has been completely removed. The database schema is managed by Prisma and includes tables for all core entities, plus `shelves` and `audit_log` as requested.
3.  **Containerization**: The entire stack (frontend, backend, database, nginx proxy) is containerized using Docker and orchestrated with Docker Compose for consistent, portable deployments.
4.  **Authentication**: A robust JWT-based authentication system has been implemented. Passwords are securely hashed using `bcrypt`. Role-Based Access Control (RBAC) is enforced at the API level.
5.  **Server-Side Operations**: CPU-intensive tasks like PDF and barcode generation are now handled on the server side for better performance and consistency.
6.  **Security**: The application is designed to be run behind an Nginx reverse proxy with TLS (HTTPS). CORS is configured to only allow requests from the frontend's domain. All secrets and configuration are managed via environment variables.

### System Diagram

```
[End User] <--- HTTPS (443) ---> [Nginx Reverse Proxy]
                                        |
                  +---------------------+---------------------+
                  | (on port 80)        | (on port 80)        |
                  | path: /api/*        | path: /             |
                  v                     v                     v
            [Backend API] <------> [PostgreSQL DB]       [Frontend Web]
        (Node.js/Fastify)                                (React/Vite)

```

---

## 2. Deployment Runbook

These instructions are for deploying on an Ubuntu 22.04 LTS server.

### Prerequisites

1.  A server with Docker, Docker Compose, Nginx, and UFW installed.
2.  A domain name pointing to your server's IP address.
3.  `git` installed on the server.

**Installation script for prerequisites:**
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-v2 nginx git ufw
sudo systemctl enable --now docker
sudo systemctl enable --now nginx
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable
```

### One-Time Setup

1.  **Clone the Repository**
    ```bash
    git clone <your-repo-url>
    cd book-re-life
    ```

2.  **Configure Environment Variables**
    - Copy the example environment files.
    ```bash
    cp .env.example .env
    cp backend/.env.example backend/.env
    ```
    - Edit `backend/.env` and `.env` to set your `DATABASE_URL` password, `JWT_SECRET`, and other configuration. **The `JWT_SECRET` must be a long, random, and secret string.**

3.  **Build and Start Services**
    ```bash
    docker compose up -d --build
    ```

4.  **Run Database Migrations and Seeding**
    - This applies the database schema and populates it with initial data.
    ```bash
    docker compose exec api npx prisma migrate deploy
    docker compose exec api npx prisma db seed
    ```

5.  **Configure Nginx and TLS**
    - Copy the provided Nginx configuration.
    ```bash
    sudo cp nginx/default.conf /etc/nginx/sites-available/book-re-life.conf
    ```
    - Edit `/etc/nginx/sites-available/book-re-life.conf` and replace `example.com` with your actual domain name.
    - Enable the site and test the configuration.
    ```bash
    sudo ln -s /etc/nginx/sites-available/book-re-life.conf /etc/nginx/sites-enabled/
    sudo nginx -t
    ```
    - Obtain a free TLS certificate from Let's Encrypt using Certbot.
    ```bash
    sudo apt-get install -y certbot python3-certbot-nginx
    sudo certbot --nginx -d example.com # Replace with your domain
    ```
    Certbot will automatically update your Nginx config for HTTPS.

### Zero-Downtime Updates

To deploy new code changes:
```bash
git pull
docker compose pull # Optional, if you're using a pre-built image registry
docker compose up -d --no-deps --build web api
# If there are new database migrations:
docker compose exec api npx prisma migrate deploy
```

### Rollback Strategy

1.  **Code Rollback**:
    - Revert to a previous stable git tag/commit.
    ```bash
    git checkout <stable-git-tag>
    ```
    - Rebuild and deploy the containers.
    ```bash
    docker compose up -d --build
    ```

2.  **Database Rollback (Emergency Only)**:
    - This involves restoring from a backup and will result in data loss since the last backup.
    - First, stop the API container to prevent connections.
    ```bash
    docker compose stop api
    ```
    - Use the restore script (see Backup & Maintenance section).
    ```bash
    ./scripts/pg-restore.sh /var/backups/book-re-life/<backup-file>.sql.gz
    ```
    - Restart the service.
    ```bash
    docker compose up -d
    ```

---

## 3. Backup & Maintenance

### Database Backups

- **Manual Backup**: Use the provided script. The backup will be stored in `/var/backups/book-re-life/` on the host.
  ```bash
  sudo ./scripts/pg-backup.sh
  ```
- **Automated Backups**: Set up a cron job to run daily backups and rotate them.
  - Open the crontab editor: `sudo crontab -e`
  - Add the following lines:
  ```cron
  # Run daily backup at 2:00 AM
  0 2 * * * /path/to/your/app/scripts/pg-backup.sh
  # Clean up backups older than 7 days
  0 3 * * * find /var/backups/book-re-life -type f -mtime +7 -name '*.gz' -delete
  ```

### Log Rotation

Docker's default `json-file` logging driver has log rotation configured by default. You can inspect and modify this in the `docker-compose.yml` file if needed. Nginx logs are managed by the system's `logrotate` utility.

---

## 4. CI/CD Skeleton (GitHub Actions)

Create a file at `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    tags:
      - 'v*.*.*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      # Add steps for linting, testing, and building images if needed
      # e.g., docker build, docker push to a registry like GHCR

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.PROD_HOST }}
          username: ${{ secrets.PROD_USERNAME }}
          key: ${{ secrets.PROD_SSH_KEY }}
          script: |
            cd /path/to/your/app
            git pull
            git checkout ${{ github.ref_name }}
            docker compose up -d --build
            docker compose exec api npx prisma migrate deploy
```
**Secrets Required**: `PROD_HOST`, `PROD_USERNAME`, `PROD_SSH_KEY`.

---

## 5. Acceptance Tests Checklist

After deployment, manually verify the following:

- [ ] **Intake**:
  - [ ] Creating a book with a new author/category successfully creates those lookup entries.
  - [ ] The generated `bookId`, `serialNumber`, and `bookCode` are correct and sequential.
  - [ ] Attempting to enter a selling price lower than the buying price fails.
- [ ] **Labels/PDFs**:
  - [ ] The "Print Labels" modal correctly generates barcode previews.
  - [ ] The final printed output is a clean PDF with Code128 barcodes.
- [ ] **POS**:
  - [ ] Scanning a valid book code adds the item to the cart.
  - [ ] A sold book cannot be added to the cart again.
  - [ ] Completing a sale marks the book as `is_sold` in the database.
  - [ ] A receipt is generated correctly.
- [ ] **Reports**:
  - [ ] Dashboard KPIs reflect recent sales and inventory changes.
  - [ ] Inventory table is searchable and accurate.
  - [ ] Donor Payouts report shows the correct owed amounts.
- [ ] **Auth**:
  - [ ] A `Staff` user cannot access the Admin or Donors pages.
  - [ ] Logging out clears the session.
- [ ] **Backups**:
  - [ ] `pg-backup.sh` creates a non-empty gzipped file.
  - [ ] `pg-restore.sh` can successfully restore the database (test on a separate, non-production instance).
```