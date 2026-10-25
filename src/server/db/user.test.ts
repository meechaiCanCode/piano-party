import * as user from "@/server/db/user";

const TEST_NORMAL_USERNAME = "john";
const TEST_ADMIN_USERNAME = "TheNoobyApple";

describe("getUserByUsername", () => {
    test("Valid user", async () => {
        const usr = await user.getUserByUsername(TEST_NORMAL_USERNAME);
        expect(usr?.username).toEqual(TEST_NORMAL_USERNAME);
        expect(usr?.isAdmin).toBeFalsy();
    });
    test("Invalid user", async () => {
        const usr = await user.getUserByUsername("invaliduser23085023958");
        expect(usr).toBeNull();
    });
});

