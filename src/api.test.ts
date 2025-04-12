import { getCookies } from "./api";

describe("api", () => {
  it("should get cookies", async () => {
    const cookies = await getCookies();
    expect(cookies).toBeDefined();
  });
});
