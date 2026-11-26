import * as user from "@/server/db/user";
import * as session from "@/server/db/session";
import { pool } from "@/server/db";

const TEST_USERNAME = "john";
let testUserID : string | null;


beforeEach(async () => {
    testUserID = (await user.getUserByUsername(TEST_USERNAME))?.id ?? null;
});

describe("getUserByUsername", () => {
    test("Valid user", async () => {
        const usr = await user.getUserByUsername(TEST_USERNAME);
        expect(usr?.username).toEqual(TEST_USERNAME);
        expect(usr?.isAdmin).toBeFalsy();
    });
    test("Invalid user", async () => {
        const usr = await user.getUserByUsername("invaliduser23085023958");
        expect(usr).toBeNull();
    });
});

describe("getUserByUserId", () => {
    test("Valid user", async () => {
        const usr = await user.getUserByUserId(testUserID);
        expect(usr?.username).toEqual(TEST_USERNAME);
        expect(usr?.isAdmin).toBeFalsy();
    });
    test("Invalid user", async () => {
        const usr = await user.getUserByUserId("ce40c0a8-2d05-4775-a1eb-849bb2601e90");
        expect(usr).toBeNull();
    });
});

describe("getUserBySession", () => {
    test("Valid user", async () => {
        const tstSession = await session.createSession(testUserID ?? "");
        const usr = await user.getUserBySession(tstSession);
        expect(usr?.username).toEqual(TEST_USERNAME);
        expect(usr?.isAdmin).toBeFalsy();
    });
    test("Garbage session", async () => {
        const tstSession : session.Session = {
            "token" : "ce40c0a8-2d05-4775-a1eb-849bb2601e90",
            "userId" : "ce40c0a8-2d05-4775-a1eb-849bb2601e90",
            "timeCreated" : new Date(0),
            "timeExpires" : new Date(1)
        }
        const usr = await user.getUserBySession(tstSession);
        expect(usr).toBeNull();
    });
    test("Null session", async () => {
        const usr = await user.getUserBySession(null);
        expect(usr).toBeNull();
    });
});

describe("createUser", () => {
    test("Valid user", async () => {
        const usr = await user.createUser("newuser2348950723985", "choochoo");
        expect(usr?.username).toEqual("newuser2348950723985");
        expect(usr?.isAdmin).toBeFalsy();
    });
    test("Invalid username", async () => {
        const usr = await user.createUser("john", "unoriginal");
        expect(usr).toBeNull();
    });
});

describe("recordActivity", () => {
    // Puts the test user's streak in a known state. A null daysAgo means "never active".
    async function setStreak(streak : number, daysAgo : number | null) {
        await pool.query(
            "UPDATE Users SET streak_count = $2, last_active_date = CURRENT_DATE - $3::int WHERE id = $1",
            [testUserID, streak, daysAgo]
        );
    }

    async function lastActiveIsToday() : Promise<boolean> {
        const result = await pool.query<{ today : boolean }>(
            "SELECT last_active_date = CURRENT_DATE AS today FROM Users WHERE id = $1",
            [testUserID]
        );
        return result.rows[0].today;
    }

    test("First activity starts streak at 1", async () => {
        await setStreak(0, null);
        const usr = await user.recordActivity(testUserID ?? "");
        expect(usr?.username).toEqual(TEST_USERNAME);
        expect(usr?.streak).toEqual(1);
        expect(await lastActiveIsToday()).toBeTruthy();
    });
    test("Active yesterday continues streak", async () => {
        await setStreak(5, 1);
        const usr = await user.recordActivity(testUserID ?? "");
        expect(usr?.streak).toEqual(6);
        expect(await lastActiveIsToday()).toBeTruthy();
    });
    test("Missed a day resets streak", async () => {
        await setStreak(5, 3);
        const usr = await user.recordActivity(testUserID ?? "");
        expect(usr?.streak).toEqual(1);
        expect(await lastActiveIsToday()).toBeTruthy();
    });
    test("Already active today keeps streak and still returns user", async () => {
        await setStreak(5, 0);
        const usr = await user.recordActivity(testUserID ?? "");
        expect(usr?.username).toEqual(TEST_USERNAME);
        expect(usr?.streak).toEqual(5);
    });
    test("Repeat calls on the same day only count once", async () => {
        await setStreak(5, 1);
        const first = await user.recordActivity(testUserID ?? "");
        const second = await user.recordActivity(testUserID ?? "");
        expect(first?.streak).toEqual(6);
        expect(second?.streak).toEqual(6);
    });
    test("Invalid user", async () => {
        const usr = await user.recordActivity("ce40c0a8-2d05-4775-a1eb-849bb2601e90");
        expect(usr).toBeNull();
    });
});
