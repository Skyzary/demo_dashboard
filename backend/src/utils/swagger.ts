import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "UNiVerse Demo Dashboard API",
      version: "1.0.0",
      description: "API documentation for the UNiVerse dashboard backend, including Moodle integration.",
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    components: {
      schemas: {
        Course: {
          type: "object",
          properties: {
            id: { type: "number" },
            fullname: { type: "string" },
            shortname: { type: "string" },
            progress: { type: "number", nullable: true },
            summary: { type: "string" },
            year: { type: "number", nullable: true },
            semester: { type: "number", nullable: true },
          },
        },
        Grade: {
          type: "object",
          properties: {
            course_name: { type: "string" },
            grade: { type: "string" },
            rawgrade: { type: "number", nullable: true },
            year: { type: "number", nullable: true },
            semester: { type: "number", nullable: true },
          },
        },
        Assignment: {
          type: "object",
          properties: {
            id: { type: "number" },
            courseName: { type: "string" },
            name: { type: "string" },
            duedate: { type: "number" },
            description: { type: "string" },
            year: { type: "number", nullable: true },
            semester: { type: "number", nullable: true },
          },
        },
        Event: {
          type: "object",
          properties: {
            id: { type: "number" },
            name: { type: "string" },
            description: { type: "string" },
            courseName: { type: "string" },
            timestart: { type: "number" },
            formattedtime: { type: "string" },
            eventtype: { type: "string" },
          },
        },
        Notification: {
          type: "object",
          properties: {
            id: { type: "number" },
            subject: { type: "string" },
            message: { type: "string" },
            timecreated: { type: "number" },
            read: { type: "boolean" },
          },
        },
      },
    },
  },
  apis: ["./src/auth/*.ts", "./src/moodle/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
