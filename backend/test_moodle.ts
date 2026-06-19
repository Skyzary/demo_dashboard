import { MoodleService } from "./src/moodle/MoodleService.ts";
import getData from "./src/utils/dataReader.ts";

async function run() {
  const token = await getData("token");
  const userId = Number(await getData("userId"));
  const service = new MoodleService({ baseUrl: "https://moodle.karazin.ua", token });
  
  const events = await service.callMoodle("core_calendar_get_calendar_upcoming_view");
  console.log("Events:", events.events?.length);
  if (events.events && events.events.length > 0) {
    console.log("First event:", JSON.stringify(events.events[0], null, 2));
  }
}
run();