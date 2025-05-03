import axios, { AxiosInstance } from "axios";
import QuickClickConsole from "./QuickClickConsole";
import config from "./config";

describe("QuickClickConsole", () => {
  it("should avoid re-login when cookie is valid", async () => {
    let signInCount = 0;

    jest.spyOn(axios, "create").mockReturnValue({
      get: jest.fn().mockResolvedValue({ data: [{ name: "test" }] }),
      post: jest.fn().mockImplementation((url, data) => {
        if (url.includes("/eaa/signin")) {
          signInCount++;
        }
        return Promise.resolve({
          data: {},
          headers: {
            "set-cookie": ["connect.sid=123"],
          },
        });
      }),
    } as unknown as AxiosInstance);

    const console = new QuickClickConsole({
      username: config.username,
      password: config.password,
      accountId: config.accountId,
      menuId: config.menuId,
    });
    await console.getSettings();
    await console.getSettings();
    expect(signInCount).toBe(1);
  });

  it("should get settings", async () => {
    const console = new QuickClickConsole({
      username: config.username,
      password: config.password,
      accountId: config.accountId,
      menuId: config.menuId,
    });
    const settings = await console.getSettings();
    expect(settings).toMatchObject({
      name: expect.any(String),
    });
  });

  it("should update product", async () => {
    const console = new QuickClickConsole({
      username: config.username,
      password: config.password,
      accountId: config.accountId,
      menuId: config.menuId,
    });
    await expect(
      console.updateProduct({
        id: 20064781,
        isAvailable: true,
      })
    ).resolves.not.toThrow();
  });
});
