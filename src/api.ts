import axios from "axios";

import config from "./config";

const api = axios.create({
  baseURL: "https://app.quickclick.cc/console/apis",
});

export const getCookies = async () => {
  const response = await api.post("/eaa/signin", {
    type: "eaa",
    username: config.username,
    password: config.password,
  });
  return response.headers["set-cookie"];
};

export default api;
