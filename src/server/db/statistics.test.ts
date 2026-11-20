import * as statistics from "@/server/db/statistics";
import { getCurrentUser } from "@/server/db/session";
import { getUserByUsername } from "./user";

jest.mock("./session", () => ({
        getCurrentUser: jest.fn(),
}));

const SAMPLE_ATTEMPT : statistics.AttemptConstructor = {
    songId : 1,

    songCompleted : true,
    timePlayed : new Date(),

    score : 5,
    notesHit : 0,
    notesMissed : 0,
    notesIncorrect : 0
}

beforeAll(async () =>
    {
        (getCurrentUser as jest.Mock).mockReturnValue(getUserByUsername("TheNoobyApple"));
    });

afterAll(() =>
    {
        jest.clearAllMocks();
    });

describe("logAttempt", () => {
    test("Valid attempt", async () => {
        const result = await statistics.logAttempt(SAMPLE_ATTEMPT); 
        expect(result).toEqual({
            id: expect.any(Number),
            userId: expect.any(String),
            songId: expect.any(Number),
            songCompleted: expect.any(Boolean),
            timePlayed: expect.any(Date),
            score: expect.any(Number),
            notesHit: expect.any(Number),
            notesMissed: expect.any(Number),
            notesIncorrect: expect.any(Number)
        });
    });

    test("Invalid attempt", async () => {
        const invalidAttempt = structuredClone(SAMPLE_ATTEMPT);
        invalidAttempt.songId = -1;

        const result = await statistics.logAttempt(invalidAttempt); 
        expect(typeof result).toBe("string");
    });
});

describe("getAttemptsByUser", () => {
    beforeAll(async () => {
        const result = await statistics.logAttempt(SAMPLE_ATTEMPT);
        if (typeof result === "string")
        {
            console.log(result);
            throw "logAttempt failed";
        }
    });

    test("User with attempts", async () => {
        const activeUser = await getUserByUsername("TheNoobyApple");
        if (!activeUser)
            throw "Default user not found";

        const result = await statistics.getAttemptsByUser(activeUser.id);
        expect(result.length).toEqual(1);
        expect(result[0].score).toBe(5);
    });

    test("User without attempts", async () => {
        const inactiveUser = await getUserByUsername("john");
        if (!inactiveUser)
            throw "Default user not found";

        const result = await statistics.getAttemptsByUser(inactiveUser.id);
        expect(result.length).toEqual(0);
    });
})