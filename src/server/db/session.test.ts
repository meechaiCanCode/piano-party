import * as user from "@/server/db/user";
import * as session from "@/server/db/session";

// NOTE that createSession basically has to work for any other tests to work

let testSession : session.Session

beforeEach(async () => {
    const testUserId = (await user.getUserByUsername("john"))?.id
    if (!testUserId)
        throw Error("Test user not found; unable to execute tests.");
    testSession = await session.createSession(testUserId);
});

describe("getSessionByToken", () => {
    test("Valid session", async () => {
        const sesh = await session.getSessionByToken(testSession.token);
        expect(sesh?.token).toEqual(testSession.token);
        expect(sesh?.userId).toEqual(testSession.userId);
        expect(sesh?.timeCreated).toEqual(testSession.timeCreated);
        expect(sesh?.timeExpires).toEqual(testSession.timeExpires);
    });
    test("Invalid session", async () => {
        const usr = await session.getSessionByToken("ce40c0a8-2d05-4775-a1eb-849bb2601e90");
        expect(usr).toBeNull();
    });
});

describe("deleteSession", () => {
    test("Valid session", async () => {
        await session.deleteSession(testSession.token)
        const sesh = await session.getSessionByToken(testSession.token)
        expect(sesh).toBeNull();
    });
    test("Invalid session", async () => {
        await session.deleteSession("ce40c0a8-2d05-4775-a1eb-849bb2601e90")
        const sesh = await session.getSessionByToken(testSession.token)
        expect(sesh).toEqual(expect.anything()); // not null or undef
    });
});
