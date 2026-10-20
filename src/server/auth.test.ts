import {findUserWithHashByUsername} from "@/server/auth";

test("Valid username exists", async () => {
    const usr = await findUserWithHashByUsername("john");
    expect(usr?.username).toEqual("john");
});
