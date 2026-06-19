import pino from "pino";
import pinoPretty from "pino-pretty";
const logger = pino({
  level: "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "SYS:dd-mm-yyyy HH:MM:ss"
    }
  }
});

export default logger;
