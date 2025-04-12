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
    const cookie = await this.getCookie();
    const response = await this.api.get<{ name: string }[]>(
      `/eaa/console/${this.configs.accountId}/settings`,
      {
        headers: {
          Cookie: cookie,
        },
      }
    );
    return response.data[0];
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
