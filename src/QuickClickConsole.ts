import axios from "axios";
import { parse } from "cookie";

const COOKIE_NAME = "connect.sid";

type Cookie = { Expires: string } & Record<string, string | undefined>;

export default class QuickClickConsole {
  private cookies: Cookie[] = [];
  private api = axios.create({
    baseURL: "https://app.quickclick.cc/console/apis",
  });

  constructor(
    private readonly configs: {
      username: string;
      password: string;
      accountId: number;
    }
  ) {}

  async getSettings() {
    const response = await this.api.get<{ name: string }[]>(
      `/eaa/console/${this.configs.accountId}/settings`,
      {
        headers: { Cookie: await this.getCookie() },
      }
    );
    return response.data[0];
  }

  async addOpeningSpecial(date: string) {
    await this.api.post(
      `/eaa/shops/${this.configs.accountId}/opening-special`,
      { date, closeDay: 100 },
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async deleteOpeningSpecial(id: number) {
    await this.api.delete(
      `/eaa/shops/${this.configs.accountId}/opening-special/${id}`,
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async listOpeningSpecial() {
    const response = await this.api.get<{ name: string }[]>(
      `/eaa/shops/${this.configs.accountId}/opening-special`,
      {
        headers: { Cookie: await this.getCookie() },
      }
    );
    return response.data;
  }

  async enableOrdering(enabled: boolean) {
    await this.api.put(
      `/eaa/console/${this.configs.accountId}/accounts`,
      {
        key: "is_enabled",
        value: enabled,
        dbTable: "accounts",
        label: "啟用點餐",
        type: "boolean",
      },
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  private extractCookie(cookies: Cookie[]): string | undefined {
    if (cookies.length === 0) {
      return undefined;
    }

    const cookie = cookies.find((cookie) => COOKIE_NAME in cookie);
    if (!cookie) {
      return undefined;
    }

    const expirationDate = new Date(cookie.Expires);
    if (expirationDate < new Date()) {
      return undefined;
    }

    return `${COOKIE_NAME}=${cookie[COOKIE_NAME]}`;
  }

  private async getCookie() {
    let cookie = this.extractCookie(this.cookies);
    if (cookie) {
      return cookie;
    }

    const response = await this.api.post("/eaa/signin", {
      type: "eaa",
      username: this.configs.username,
      password: this.configs.password,
    });
    const cookies = response.headers["set-cookie"];
    if (!cookies) {
      throw new Error("No cookies returned from login");
    }

    const parsedCookies = cookies.map((cookie) => parse(cookie) as Cookie);
    cookie = this.extractCookie(parsedCookies);
    if (!cookie) {
      throw new Error(`No ${COOKIE_NAME} cookie returned from login`);
    }

    this.cookies = parsedCookies;

    return cookie;
  }
}
