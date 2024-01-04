# Thekedar-pro-server

Thekedar-pro-server is a Node.js server designed for Thekedar-app, a worker management system for Thekedars. This server facilitates tasks such as attendance tracking and settlement management for workers.

## Getting Started

### Manual Setup

1. Install Node.js(18) and MongoDB(7) (you can use Atlas too).
2. Create a .env in root directory and copy the content of sample.env and update with your data
3. Obtain your MongoDB URI from atlas and add it to .env
    ```
    mongodb+srv://<username>:<password>@cluster@example.mongodb.net
    ```

4. Some variables in `sample.env` are for email sending they are below, use your own
    ```
    SMTP_HOST=
    SMTP_PORT=
    SMTP_USER=
    SMTP_PASS=
    ```
5. Run the following commands in the terminal:
   ```
   npm install
   npm run dev
   ```

### Docker Setup

1. Clone the repository and navigate to the project directory.
2. There `Dockerfile` and the `docker-compose.yaml` file to create containers for MongoDB and Node.js server use the docker commands are given below.
3. Update the commented env for email sending in `docker-compose.yaml` file
    ```
    SMTP_HOST=
    SMTP_PORT=
    SMTP_USER=
    SMTP_PASS=
    ```
### Docker Commands

1. Build and start containers:
   ```
   docker compose up -d --build
   ```

2. Build and start containers without detaching (for viewing logs):
   ```
   docker compose up --build
   ```

This will run the server with default env in `docker-compose.yaml` file. If you want to change you can modify the env in `docker-compose.yaml` file

