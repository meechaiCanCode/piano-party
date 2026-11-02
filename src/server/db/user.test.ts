import * as user from "@/server/db/user";
import * as session from "@/server/db/session";

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
