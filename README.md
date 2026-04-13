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

| Variable | Description | Default |
|----------|-------------|---------|
| `SFTP_HOST` | SFTP server hostname | `localhost` |
| `SFTP_PORT` | SFTP server port | `22` |
| `SFTP_USERNAME` | SFTP username | - |
| `SFTP_PASSWORD` | SFTP password | - |
| `SFTP_PRIVATE_KEY_PATH` | Path to SSH private key (alternative to password) | - |
| `SFTP_REMOTE_PATH` | Remote folder to monitor | `/upload` |
| `SFTP_POLL_INTERVAL_MS` | Polling interval in milliseconds | `5000` |
| `KAFKA_BROKERS` | Comma-separated list of Kafka brokers | `localhost:9092` |
| `KAFKA_CLIENT_ID` | Kafka client identifier | `sftp-source` |
| `KAFKA_TOPIC` | Kafka topic to publish documents | `sftp-documents` |
| `PORT` | HTTP server port | `3000` |

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

Start Kafka and an SFTP server for local testing:

```bash
# Start Kafka
docker run -d --name kafka \
  -p 9092:9092 \
  -e KAFKA_CFG_NODE_ID=0 \
  -e KAFKA_CFG_PROCESS_ROLES=controller,broker \
  -e KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093 \
  -e KAFKA_CFG_ADVERTISED_LISTENERS=PLAINTEXT://localhost:9092 \
  -e KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=0@localhost:9093 \
  -e KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER \
  bitnami/kafka:latest

# Start SFTP server
docker run -d --name sftp \
  -p 2222:22 \
  -e SFTP_USERS=user:password:::upload \
  atmoz/sftp:latest
```

Then configure your `.env`:

```
SFTP_HOST=localhost
SFTP_PORT=2222
SFTP_USERNAME=user
SFTP_PASSWORD=password
SFTP_REMOTE_PATH=/upload
KAFKA_BROKERS=localhost:9092
```

## License

MIT
