# Piano Party

Learn piano with gamified sheet-music playing on the web.

Piano Party is a Next.js based webapp that gamifies learning sheet music by allowing users to play music on their keyboard with feedback on their performance.

## Features

- n+ Songs: Choose from several different options to learn music across various genres and difficulties.
- Receive Feedback: Following a song session, receive immediate feedback on details of a performance, like missed notes and timing.
- Track Progress: Progress is saved and tracked between sessions so users can observe changes and improvements in their playing.

## Getting Started

### Set up the database on your machine.
Install PostgreSQL
```bash
sudo apt update
sudo apt install postgresql
sudo service postgresql start
```
The last line must be re-run each time you restart your session.

Create the database
```bash
sudo -u postgres psql
```
```sql
ALTER USER postgres PASSWORD 'password';
CREATE DATABASE ppdb;
\q
```
You can use any password or database name you want, but they must match with the next step

Set the connection string by creating a file named `.env.local` in the project root (it is gitignored, do not commit it):
eg.
```
DATABASE_URL=postgres://postgres:password@localhost:5432/ppdb
```
Format: `postgres://USER:PASSWORD@HOST:PORT/DATABASE`

### Create tables and load test data
```bash
npm run db:reset
```
This will wipe the current database and rebuild from `server/db/schema.sql`, then load test data from `server/db/seed.sql`

### Install dependencies
```bash
npm install
```

### Run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.


## Test accounts
| Credentials | Significance |
|---|---|
| TheNoobyApple:securepass | Admin account |
| john:jdlover | User account |