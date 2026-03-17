// Unit test functions for the auth.ts functions

import { describe, it, expect, beforeAll } from "vitest";
import { makeJWT, validateJWT } from "./auth";

describe("JWT Creation And Validation", () => {
   const user1 = "some-user-id";
   const user2 = "some-other-user-id";
   const password1 = "password1234";
   const password2 = "my_deepest_darkest_desires";
   let jwt1: string;
   let jwt2: string;

   beforeAll(() => {
       jwt1 = makeJWT(user1, 1000, password1);
       jwt2 = makeJWT(user2, 1000, password2);
    });

   it("should create a JWT based on the user id and password", () => {
       expect(jwt1).toBeDefined();
    });

   it("should be able to be decoded back into its original form", () => {
       const decoded = validateJWT(jwt1, password1);
       expect(decoded).toBe(user1);
    });

   it("should throw an error when validated with the wrong credentials", () => {
       expect(() => validateJWT(jwt1, password2)).toThrowError();
    });
});
