type DataSwitch = "token" | "userId";
interface DataType {
  token: string;
  userId: string;
}
import { readFile } from "fs/promises";
export default async function getData(type: DataSwitch): Promise<string> {
  try {
    const data = await readFile("./src/data.json", "utf-8");
    const parsedData: DataType = JSON.parse(data);
    return parsedData[type];
  } catch (error) {
    throw new Error("Failed to read data");
  }
}
