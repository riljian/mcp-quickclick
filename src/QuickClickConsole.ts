import axios from "axios";
import { parse } from "cookie";
import { pick, merge } from "lodash";

const COOKIE_NAME = "connect.sid";

type Cookie = { Expires: string } & Record<string, string | undefined>;

export default class QuickClickConsole {
  private cookies: Cookie[] = [];
  private api = axios.create({
    baseURL: "https://app.quickclick.cc",
  });

  constructor(
    private readonly configs: {
      username: string;
      password: string;
      accountId: number;
      menuId: number;
    }
  ) {}

  async getSettings() {
    const response = await this.api.get<{ name: string }[]>(
      `/console/apis/eaa/console/${this.configs.accountId}/settings`,
      {
        headers: { Cookie: await this.getCookie() },
      }
    );
    return response.data[0];
  }

  async addDayOff(date: string) {
    await this.api.post(
      `/console/apis/eaa/shops/${this.configs.accountId}/opening-special`,
      { date, closeDay: 100 },
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async deleteDayOff(id: number) {
    await this.api.delete(
      `/console/apis/eaa/shops/${this.configs.accountId}/opening-special/${id}`,
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async listDayOffs() {
    const response = await this.api.get<{ name: string }[]>(
      `/console/apis/eaa/shops/${this.configs.accountId}/opening-special`,
      {
        headers: { Cookie: await this.getCookie() },
      }
    );
    return response.data;
  }

  async listProducts(filter?: {
    name?: string;
  }): Promise<{ id: number; price: number; name: string }[]> {
    const response = await this.api.get<
      { id: number; amount: number; name: string }[]
    >(`/admin/web-apis/menus/${this.configs.menuId}/products`, {
      headers: { Cookie: await this.getCookie() },
    });
    const filteredProducts = response.data.filter((product) => {
      if (filter?.name) {
        return product.name.includes(filter.name);
      }
      return true;
    });
    const normalizedProducts = filteredProducts.map((product) => ({
      id: product.id,
      price: product.amount,
      name: product.name,
    }));
    return normalizedProducts;
  }

  async getProduct(id: number) {
    const response = await this.api.get<{
      amount: number;
      name: string;
      description: string;
      isVisibled: 0 | 1;
      categoryId: number;
      categoryName: string;
    }>(`/admin/web-apis/products/${id}`, {
      headers: { Cookie: await this.getCookie() },
    });
    return response.data;
  }

  async createProduct(product: {
    price: number;
    name: string;
    description?: string;
    isVisible: boolean;
    categoryId: number;
  }) {
    await this.api.post(
      `/admin/web-apis/menus/${this.configs.menuId}/products`,
      {
        amount: product.price,
        name: product.name,
        description: product.description ?? "",
        isVisibled: product.isVisible ? 1 : 0,
        calories: null,
        categoryId: product.categoryId,
        code: "",
        image: "",
        stock: null,
        stockReset: null,
        tempFile: null,
        variations: {},
      },
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async updateProduct(product: {
    id: number;
    price?: number;
    name?: string;
    description?: string;
    isVisible?: boolean;
  }) {
    const originalProduct = await this.getProduct(product.id);
    const newProduct = merge(
      pick(originalProduct, [
        "calories",
        "categoryId",
        "code",
        "image",
        "stock",
        "stockReset",
      ]),
      {
        amount: product.price ?? originalProduct.amount,
        name: product.name ?? originalProduct.name,
        description: product.description ?? originalProduct.description,
        isVisibled: originalProduct.isVisibled,
        tempFile: null,
        variations: {
          ubereats: {},
          foodpanda: {},
        },
      }
    );
    if (product.isVisible !== undefined) {
      newProduct.isVisibled = product.isVisible ? 1 : 0;
    }
    console.log("Updating product", JSON.stringify(newProduct));
    await this.api.put(`/admin/web-apis/products/${product.id}`, newProduct, {
      headers: { Cookie: await this.getCookie() },
    });
  }

  async updateToGoWaitingTime(waitingTime: number) {
    await this.api.put(
      `/console/apis/eaa/console/${this.configs.accountId}/business`,
      {
        dbTable: "business",
        key: "to_go_waiting_time",
        label: "Takeout Preparation Time",
        type: "string",
        value: waitingTime.toString(),
        origin: waitingTime.toString(),
      },
      { headers: { Cookie: await this.getCookie() } }
    );
  }

  async enableOrdering(enabled: boolean) {
    await this.api.put(
      `/console/apis/eaa/console/${this.configs.accountId}/accounts`,
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

    const response = await this.api.post("/console/apis/eaa/signin", {
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
