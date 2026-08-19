import { createBdd } from "playwright-bdd";
import { test } from "../fixtures/test";

export { expect, test } from "../fixtures/test";

export const { Given, When, Then, Before, After } = createBdd(test);
