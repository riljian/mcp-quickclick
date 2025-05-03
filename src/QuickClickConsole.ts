import axios from "axios";
import { parse } from "cookie";
import { pick, merge } from "lodash";

const COOKIE_NAME = "connect.sid";

type Cookie = { Expires: string } & Record<string, string | undefined>;

const PRODUCT_CACHE_EXPIRATION = 1000 * 60 * 10; // 10 minutes

export default class QuickClickConsole {
  private cookies: Cookie[] = [];
  private api = axios.create({
    baseURL: "https://app.quickclick.cc",
  });
  private productAvailableCache: Map<
    number,
    {
      isAvailable: boolean;
      syncAt: number;
    }
  > = new Map();

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
  }): Promise<
    { id: number; price: number; name: string; isAvailable: boolean }[]
  > {
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
    const now = Date.now();
    return Promise.all(
      filteredProducts.map(async (product) => {
        const availableCache = this.productAvailableCache.get(product.id);
        if (
          availableCache &&
          availableCache.syncAt > now - PRODUCT_CACHE_EXPIRATION
        ) {
          return {
            id: product.id,
            price: product.amount,
            name: product.name,
            isAvailable: availableCache.isAvailable,
          };
        }

        const updatedProduct = await this.getProduct(product.id);
        return {
          id: product.id,
          price: updatedProduct.amount,
          name: updatedProduct.name,
          isAvailable: updatedProduct.isAvailable,
        };
      })
    );
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
    const { isVisibled, ...rest } = response.data;
    const product = {
      ...rest,
      isAvailable: isVisibled === 1,
    };

    this.productAvailableCache.set(id, {
      isAvailable: product.isAvailable,
      syncAt: Date.now(),
    });

    return product;
  }

  async createProduct(product: {
    price: number;
    name: string;
    description?: string;
    isAvailable: boolean;
    categoryId: number;
  }) {
    await this.api.post(
      `/admin/web-apis/menus/${this.configs.menuId}/products`,
      {
        amount: product.price,
        name: product.name,
        description: product.description ?? "",
        isVisibled: product.isAvailable ? 1 : 0,
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
    isAvailable?: boolean;
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
        isVisibled: originalProduct.isAvailable ? 1 : 0,
        tempFile: null,
        variations: {
          ubereats: {},
          foodpanda: {},
        },
      }
    );
    if (product.isAvailable !== undefined) {
      newProduct.isVisibled = product.isAvailable ? 1 : 0;
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
