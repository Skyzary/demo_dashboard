import { writeFile } from "fs/promises";
import logger from "../utils/logger.ts";
export class AuthService {
  async getToken(username: string, password: string): Promise<string> {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }
    try {
      const response = await fetch(
        `https://moodle.karazin.ua/login/token.php?username=${username}&password=${password}&service=moodle_mobile_app`
      );
      const data = await response.json();
      return data.token;
    } catch (error) {
      throw new Error("Failed to get token", { cause: error });
    }
  }
  async getUserId(token: string): Promise<string> {
    if (!token) {
      throw new Error("Username and password are required");
    }
    if (!token) {
      throw new Error("Token is required");
    }
    try {
      const response = await fetch(
        `https://moodle.karazin.ua/webservice/rest/server.php?wstoken=${token}&wsfunction=core_webservice_get_site_info&moodlewsrestformat=json`
      );
      const data = await response.json();
      return data.userid;
    } catch (error) {
      throw new Error("Failed to get user ID");
    }
  }
  async writeData(
    username: string,
    password: string
  ): Promise<{ token: string; userId: string }> {
    if (!username || !password) {
      throw new Error("Username and password are required");
    }
    const uToken = await this.getToken(username, password);
    const data = {
      token: uToken,
      userId: await this.getUserId(uToken)
    };
    await writeFile("./src/data.json", JSON.stringify(data, null, 2), "utf-8");
    return data;
  }
}
