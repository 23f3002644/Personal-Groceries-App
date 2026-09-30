# Personal Groceries

A personal grocery planning app built with MongoDB, Express, React, and Node.js (MERN). Use the catalog to manage grocery categories and items, then create a dated shopping plan, compare it with a budget, and track purchases.

## Features

### Daily purchase dashboard

- Choose a date and set the amount available for that day's shopping.
- Add catalog items to the plan with a quantity and a priority: High, Medium, or Low.
- See line costs, purchased totals, recommended spend, and the budget left after recommended items.
- Get an affordability recommendation that checks higher-priority items first. If one item does not fit, the app continues checking lower-priority items rather than stopping.
- See items that remain pending and the extra amount needed to cover all pending items.
- Mark saved plan items as purchased or pending.
- Save one plan per date and revisit recent saved days.

The recommendation fits whole planned quantities; it does not split quantities or calculate a globally optimal knapsack solution. Review the recommendation before shopping.

### Catalog

- Create, rename, and remove categories.
- Create, edit, and remove grocery items, including their name, base price per unit, and category.
- Assign multiple items to a category.
- A category cannot be removed while catalog items still use it; move or remove those items first.

## Technology

- **Frontend:** React 19 and Vite
- **Backend:** Node.js and Express 5
- **Database:** MongoDB with Mongoose
- **Frontend/backend development connection:** Vite proxies `/api` requests to Express at `http://localhost:5000`.

## Requirements

Install these before running the app:

- Node.js (a current LTS version is recommended)
- npm (included with Node.js)
- A MongoDB database, for example a MongoDB Atlas cluster

## Open the project

Open the `Groceries` folder in Visual Studio Code. In VS Code, use **File → Open Folder...** and select the project folder. The `backend` and `frontend` folders are separate npm packages, so run their commands in separate terminals.

## Configure MongoDB

Create `backend/.env` and add your MongoDB connection string:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<your-cluster-host>/<database-name>?retryWrites=true&w=majority
PORT=5000
```

Use the connection string from MongoDB Atlas or your MongoDB server. Replace the example values with your own; do not include angle brackets in the actual URI. URL-encode special characters in the database password. In Atlas, make sure the database user and network access/IP allowlist permit the connection.

Keep `.env` private. It is ignored by Git; never commit database credentials or paste them into issues or public chats. If a credential has been exposed, rotate it in MongoDB before continuing.

## Install and run

Open two VS Code terminals with the working directory set to the `Groceries` project folder.

**Terminal 1: backend**

```powershell
cd backend
npm install
npm run dev
```

The backend connects to MongoDB before it begins listening. When connected, it runs at `http://localhost:5000`. If it exits, check the `MONGO_URI`, Atlas network access, and database credentials in `backend/.env`.

**Terminal 2: frontend**

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL printed in the terminal, usually `http://localhost:5173/`. Keep both terminals running while using the app. The frontend sends API calls through the Vite proxy to the backend.

## Verify the setup

- Open `http://localhost:5000/api/health` to check that the backend responds and reports its MongoDB connection state.
- Open the frontend URL and check that catalog categories and items load in the Catalog view and item selector.
- Add a draft to the Daily plan, set a budget and priorities, and review the recommendation. Click **Save daily plan** to store the date's plan.
- Run frontend checks from the project root:

```powershell
cd frontend
npm run build
npm run lint
```

## Data storage

The app stores data in the MongoDB database identified by `MONGO_URI`:

- `categories`: category names.
- `tasks`: catalog item names, base prices per unit, and category references.
- `dailyplans`: one daily plan per date, including its budget, item/price snapshots, quantities, priorities, and purchase statuses.

Daily plan snapshots preserve the item name and unit price used when the plan was saved, even if the catalog item is later edited.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Check backend and MongoDB connection state |
| `GET`, `POST` | `/api/categories` | List or create categories |
| `PATCH`, `DELETE` | `/api/categories/:id` | Rename or remove a category |
| `GET`, `POST` | `/api/tasks` | List or create catalog items |
| `PATCH`, `DELETE` | `/api/tasks/:id` | Edit or remove a catalog item |
| `GET` | `/api/plans?date=YYYY-MM-DD` | Load one daily plan |
| `GET` | `/api/plans` | List recent daily plans |
| `PUT` | `/api/plans/:date` | Save the budget and planned items for a date |
| `PATCH` | `/api/plans/:date/items/:entryId` | Mark a saved plan item purchased or pending |
