import {pool} from "@/server/db"
import type {PoolClient} from "pg";

let client: PoolClient;

beforeEach(async () => {
    client = await pool.connect();
    await client.query("BEGIN");
    // Every pool.query will belong to this BEGIN block for rollback
    jest.spyOn(pool, "query").mockImplementation(
        ((...args: Parameters<PoolClient["query"]>) => client.query(...args)) as typeof pool.query
    );
});

afterEach(async () => {
  jest.restoreAllMocks();
  await client.query("ROLLBACK");
  client.release();
});

afterAll(async ()=>{
    await pool.end();
});


