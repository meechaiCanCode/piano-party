import * as admin from "@/server/db/admin"
import * as user from "@/server/db/user"

const TEST_USERNAME = "john"
let testUserID : string | null;


beforeEach(async () => {
    testUserID = (await user.getUserByUsername(TEST_USERNAME))?.id ?? null;
});

describe("setUserBan", () => {
    test("Banning user", async () => {
        // Test banning
        expect(await admin.setUserBan(testUserID, new Date("3000-1-1"))).toBeDefined(); // WARNING - will break in the year 3000. please change before then
        const result = await admin.isUserBanned(testUserID);
        expect(result).toBeTruthy();
    });

    test("Unbanning user by null", async () => {
        // Ban user
        await admin.setUserBan(testUserID, new Date("3000-1-1"));
        // Unban user
        await admin.setUserBan(testUserID, null);
        const result = await admin.isUserBanned(testUserID);
        expect(result).toEqual(false); // and NOT null
    });
});

describe("isUserBanned", () => {
    test("Expired ban", async () => {
        // Ban user
        await admin.setUserBan(testUserID, new Date("2000-1-1")); // WARNING - will break before the year 2000. change before time machine PBI implemented.
        const result = await admin.isUserBanned(testUserID);
        expect(result).toEqual(false);
    });
});

describe("getBannedUsers", () => {
  test("Returns all banned users, sorted by expiry", async () => {
    const banned = await admin.getBannedUsers();
    expect(banned[0].username).toEqual("MrSoonUnbanned");
    expect(banned[1].username).toEqual("MrBanned");
  })
})
