# MongoDB Document Structure

This file documents the MongoDB collections and document shape used by the backend in `backend/server.js`.

## Collections

### 1. `progress`
Tracks topic completion state for each user.

Example document:
```json
{
  "_id": "64b8f67a1e2a8c3d4b5f6a7b",
  "username": "student1",
  "topic": "qubit",
  "completed": true,
  "completedAt": "2026-06-19T12:34:56.789Z",
  "__v": 0
}
```

Fields:
- `username` (String, required)
- `topic` (String, required)
- `completed` (Boolean, defaults to `false`)
- `completedAt` (Date, defaults to current date/time)

### 2. `quiz`
Stores quiz attempt results, score data, and answer details.

Example document:
```json
{
  "_id": "64b8f67a1e2a8c3d4b5f6a7c",
  "username": "student1",
  "topic": "circuit",
  "score": 5,
  "total": 6,
  "answers": [
    { "question": "What is a qubit?", "selected": "A digit", "correct": false },
    { "question": "What does the Bloch sphere show?", "selected": "Quantum state", "correct": true }
  ],
  "attemptedAt": "2026-06-19T12:45:00.000Z",
  "__v": 0
}
```

Fields:
- `username` (String, required)
- `topic` (String, required)
- `score` (Number, required)
- `total` (Number, required)
- `answers` (Array of objects):
  - `question` (String)
  - `selected` (String)
  - `correct` (Boolean)
- `attemptedAt` (Date, defaults to current date/time)

## Notes

- The backend connects to MongoDB using the default URI `mongodb://localhost:27017/quantum_app` unless `MONGO_URI` is set in the environment.
- The `progress` collection uses an upsert operation to create or update completion records.
- The `quiz` collection stores one document per quiz submission.
