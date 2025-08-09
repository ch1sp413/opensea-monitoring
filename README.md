# OpenSea Monitoring

A simple full-stack application that lets organisations monitor OpenSea for potential misuse of their intellectual property.

## Features
- Store an OpenSea API key securely in a Postgres database.
- Search OpenSea for assets matching user supplied keywords (case insensitive partial match).
- View basic metrics such as number of matching listings, with links back to OpenSea.
- Time range selector for 24 hours, 7 days, 30 days or custom date range.
- Daily background job that refreshes data.
- Container friendly with Docker and Docker Compose configuration ready for AKS deployment.

## Development
```
docker-compose up --build
```
Frontend is served at http://localhost:3000 and backend at http://localhost:4000.
