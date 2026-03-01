# ProjectHub - Full Stack Project Management Tool

A complete project management application built with:

- **Backend:** Node.js, Express.js, MySQL, Prisma ORM, JWT Auth
- **Frontend:** Vite + React, Tailwind CSS, Zustand, @dnd-kit, Axios

---

## Features

- ✅ JWT Authentication with Refresh Token
- ✅ Project Management (Create, Update, Delete)
- ✅ Board Management per Project
- ✅ Task Management (CRUD, Status, Priority, Due Date, Assignee)
- ✅ Drag & Drop Kanban Board (4 columns: Todo → In Progress → In Review → Done)
- ✅ Comments & Activity History on Tasks
- ✅ Role-based Access Control (Owner, Admin, Member, Viewer)
- ✅ Invite/Remove Project Members
- ✅ Search & Filter Tasks
- ✅ Pagination (API)
- ✅ Centralized Error Handling
- ✅ Consistent API Response Structure

---

## Prerequisites

- Node.js >= 18
- MySQL >= 8.0

---

## Setup

### 1. Clone & Navigate

```bash
git clone <your-repo>
cd project-manager
```

---

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` from the example:
```bash
cp .env.example .env
```

Edit `.env` with your MySQL credentials:
```env
DATABASE_URL="mysql://root:yourpassword@localhost:3306/project_manager"
JWT_SECRET="your-super-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret-key"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

Create the MySQL database:
```sql
CREATE DATABASE project_manager;
```

Run Prisma migrations:
```bash
npx prisma migrate dev --name init
npx prisma generate
```

Start the backend:
```bash
npm run dev
```

Server starts at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend starts at: `http://localhost:5173`

The Vite dev server proxies `/api` requests to the backend automatically.

---

## Project Structure

```
project-manager/
├── backend/
│   ├── prisma/
│   │   └── schema.prisma          # MySQL schema
│   ├── src/
│   │   ├── controllers/           # Route handlers
│   │   │   ├── auth.controller.js
│   │   │   ├── board.controller.js
│   │   │   ├── project.controller.js
│   │   │   ├── task.controller.js
│   │   │   └── user.controller.js
│   │   ├── lib/
│   │   │   └── prisma.js          # Prisma client singleton
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js  # JWT + RBAC
│   │   │   ├── error.middleware.js
│   │   │   └── validate.middleware.js
│   │   ├── routes/                # Express routes
│   │   │   ├── auth.routes.js
│   │   │   ├── board.routes.js
│   │   │   ├── project.routes.js
│   │   │   ├── task.routes.js
│   │   │   └── user.routes.js
│   │   └── index.js               # App entry point
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── layout/
    │   │       └── AppLayout.jsx  # Sidebar layout
    │   ├── lib/
    │   │   └── api.js             # Axios instance + interceptors
    │   ├── pages/
    │   │   ├── LoginPage.jsx
    │   │   ├── RegisterPage.jsx
    │   │   ├── DashboardPage.jsx  # Project list
    │   │   ├── ProjectPage.jsx    # Boards + Members
    │   │   └── BoardPage.jsx      # Kanban board
    │   ├── stores/                # Zustand state
    │   │   ├── authStore.js
    │   │   ├── boardStore.js
    │   │   └── projectStore.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── vite.config.js
    └── package.json
```

---

## API Documentation

### Auth

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Get current user |

### Projects

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:projectId` | Get project details |
| PUT | `/api/projects/:projectId` | Update project |
| DELETE | `/api/projects/:projectId` | Delete project |
| POST | `/api/projects/:projectId/members` | Invite member |
| DELETE | `/api/projects/:projectId/members/:memberId` | Remove member |

### Boards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:projectId/boards` | List boards |
| POST | `/api/projects/:projectId/boards` | Create board |
| PUT | `/api/projects/:projectId/boards/:boardId` | Update board |
| DELETE | `/api/projects/:projectId/boards/:boardId` | Delete board |

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/tasks` | List tasks (with filters + pagination) |
| POST | `/api/boards/:boardId/tasks` | Create task |
| GET | `/api/tasks/:taskId` | Get task with comments & activity |
| PUT | `/api/tasks/:taskId` | Update task |
| DELETE | `/api/tasks/:taskId` | Delete task |
| PATCH | `/api/tasks/:taskId/move` | Move task (status/board) |
| POST | `/api/tasks/:taskId/comments` | Add comment |
| DELETE | `/api/comments/:commentId` | Delete comment |

### Query Params for GET /tasks

| Param | Description |
|-------|-------------|
| `status` | Filter by: TODO, IN_PROGRESS, IN_REVIEW, DONE |
| `priority` | Filter by: LOW, MEDIUM, HIGH, URGENT |
| `assigneeId` | Filter by user ID |
| `search` | Text search on title & description |
| `page` | Page number (default: 1) |
| `limit` | Results per page (default: 50) |

### Response Format

All endpoints return a consistent structure:

```json
{
  "success": true,
  "message": "Optional message",
  "data": { ... },
  "pagination": { "total": 100, "page": 1, "limit": 50, "pages": 2 }
}
```

---

## Database Schema (MySQL/Prisma)

### Tables

- **User** - Auth, profile
- **RefreshToken** - Token rotation
- **Project** - Project details, owner
- **ProjectMember** - User ↔ Project with role (OWNER/ADMIN/MEMBER/VIEWER)
- **Board** - Boards inside projects
- **Task** - Tasks inside boards (status, priority, due date, assignee)
- **TaskTag** - Tags on tasks
- **Comment** - Comments on tasks
- **ActivityLog** - Action history on tasks

---

## Architecture Decisions

- **Prisma ORM** for type-safe MySQL queries and easy migrations
- **JWT with refresh token rotation** for secure stateless auth
- **Zustand** over Redux for lightweight, simple global state
- **@dnd-kit** for accessible, performant drag-and-drop
- **Vite** for fast HMR and modern build tooling
- **Role-based middleware** applied at route level for clean separation

---

## Build for Production

```bash
# Backend
cd backend
NODE_ENV=production node src/index.js

# Frontend
cd frontend
npm run build
# Serve dist/ with your web server or:
npm run preview
```
