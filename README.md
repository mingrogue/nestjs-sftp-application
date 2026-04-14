# SFTP Source Application

A NestJS application that monitors an SFTP folder for new/modified documents and sends their content to Apache Kafka.

## Features

- **SFTP Folder Monitoring**: Polls an SFTP directory at configurable intervals
- **Change Detection**: Tracks file modifications to avoid reprocessing unchanged files
- **Kafka Integration**: Sends document content as JSON messages to a Kafka topic
- **Auto-reconnection**: Automatically attempts to reconnect if SFTP connection is lost
- **Configurable**: All settings via environment variables

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ SFTP Server │────▶│ SFTP Source  │────▶│    Kafka    │
│   (files)   │     │  Application │     │   (topic)   │
└─────────────┘     └──────────────┘     └─────────────┘
```

## Prerequisites

- Node.js 18+
- Access to an SFTP server
- Apache Kafka cluster

## Installation

```bash
npm install
```

## Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### Environment Variables

| Variable                | Description                                       | Default          |
| ----------------------- | ------------------------------------------------- | ---------------- |
| `SFTP_HOST`             | SFTP server hostname                              | `localhost`      |
| `SFTP_PORT`             | SFTP server port                                  | `22`             |
| `SFTP_USERNAME`         | SFTP username                                     | `user`           |
| `SFTP_PASSWORD`         | SFTP password                                     | `password`       |
| `SFTP_PRIVATE_KEY_PATH` | Path to SSH private key (alternative to password) | -                |
| `SFTP_REMOTE_PATH`      | Remote folder to monitor                          | `/upload`        |
| `SFTP_POLL_INTERVAL_MS` | Polling interval in milliseconds                  | `5000`           |
| `KAFKA_BROKERS`         | Comma-separated list of Kafka brokers             | `localhost:9092` |
| `KAFKA_CLIENT_ID`       | Kafka client identifier                           | `sftp-source`    |
| `KAFKA_TOPIC`           | Kafka topic to publish documents                  | `sftp-documents` |
| `PORT`                  | HTTP server port                                  | `3000`           |

## Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## Kafka Message Format

Documents are sent to Kafka with the following JSON structure:

```json
{
  "fileName": "document.txt",
  "filePath": "/upload/document.txt",
  "content": "File content as string...",
  "processedAt": "2024-01-15T10:30:00.000Z"
}
```

### Message Headers

- `content-type`: `application/json`
- `source`: `sftp-source`

## Project Structure

```
src/
├── config/
│   └── configuration.ts    # Configuration loader
├── kafka/
│   ├── kafka.module.ts     # Kafka module
│   ├── kafka.service.ts    # Kafka producer service
│   └── index.ts
├── sftp/
│   ├── sftp.module.ts      # SFTP module
│   ├── sftp.service.ts     # SFTP watcher service
│   └── index.ts
├── app.module.ts           # Main application module
└── main.ts                 # Application entry point
```

## Testing with Docker

Start Kafka, SFTP and Redis services for local testing:

```bash
docker-compose -f docker-compose.infra.yml up -d      (To run all services)

Then configure your `.env` -

SFTP_HOST=sftp
SFTP_PORT=22
SFTP_USERNAME=user
SFTP_PASSWORD=password
SFTP_PRIVATE_KEY_PATH=
SFTP_REMOTE_PATH=/upload
SFTP_POLL_INTERVAL_MS=5000
KAFKA_BROKERS=kafka:29092
KAFKA_CLIENT_ID=sftp-source
KAFKA_TOPIC=sftp-documents
REDIS_HOST=redis
REDIS_PORT=6379
PORT=3000

```

Run `npm i`
Run `npm run build` in the root directory. This will create the dist files which will be used by the docker-compose directly.

Now to start the SFTP Application service -

```bash

docker-compose -f docker-compose.app.yml up




Cleanup - 

```bash
docker-compose -f docker-compose.app.yml down --remove-orphans
docker-compose -f docker-compose.infra.yml down --remove-orphans
```
