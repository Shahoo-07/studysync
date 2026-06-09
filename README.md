# StudySync

Collaborative exam preparation and progress tracking platform.

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Run migrations
docker-compose exec server npm run migrate

# Seed database (optional)
docker-compose exec server npm run seed

# Stop services
docker-compose down
```

## Architecture

- **Backend**: Node.js + Express on port 3001
- **Frontend**: React + Vite on port 5173
- **Database**: PostgreSQL on port 5432
- **Cache**: Redis on port 6379

## Phases

1. **Phase 1**: Foundation & Syllabus Builder
2. **Phase 2**: Analytics & Study Streaks
3. **Phase 3**: Friends, Sharing & Leaderboard
4. **Phase 4**: File Sharing
5. **Phase 5**: Study Groups

## Technology Stack

- Express.js for backend APIs
- React with Vite for frontend
- PostgreSQL for persistent data
- Redis for caching/sessions
- Socket.io for real-time features
- JWT for authentication
- TailwindCSS for styling
