import express from "express";
import type { Request, Response } from "express";
import { MoodleService } from "./MoodleService.ts";
import logger from "../utils/logger.ts";
import getData from "../utils/dataReader.ts";
import { filterCourses, matchesYearAndSemester } from "../utils/moodleFilters.ts";

export const moodleRouter = express.Router();

/**
 * @openapi
 * tags:
 *   name: Moodle
 *   description: Moodle integration endpoints
 */

const getMoodleService = async () => {
  const baseUrl = "https://moodle.karazin.ua";
  const token = await getData("token");

  if (!token) {
    throw new Error("Moodle Token not found. Please login first.");
  }

  return new MoodleService({ baseUrl, token });
};

const getUserId = async () => {
  const userId = await getData("userId");
  if (!userId) {
    throw new Error("User ID not found. Please login first.");
  }
  return Number(userId);
};

/**
 * @openapi
 * /moodle/courses:
 *   get:
 *     summary: Get user courses
 *     tags: [Moodle]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, not_completed, in_progress, not_started]
 *         description: Filter courses by completion status
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Filter courses by year (e.g., 2023)
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter courses by semester (e.g., 1 or 2)
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 */
moodleRouter.get("/courses", async (req: Request, res: Response) => {
  try {
    const { status, year, semester } = req.query;
    const service = await getMoodleService();
    const userId = await getUserId();
    let courses = await service.getCourses(userId);

    courses = filterCourses(courses, {
      status: status as string,
      year: year as string,
      semester: semester as string
    });

    res.json(courses);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/courses/{courseId}/contents:
 *   get:
 *     summary: Get course contents
 *     tags: [Moodle]
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Course contents including sections, modules, etc.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
moodleRouter.get("/courses/:courseId/contents", async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;
    const service = await getMoodleService();
    const contents = await service.getCourseContents(Number(courseId));
    res.json(contents);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/grades:
 *   get:
 *     summary: Get user grades
 *     tags: [Moodle]
 *     parameters:
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Filter grades by year
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter grades by semester
 *     responses:
 *       200:
 *         description: List of grades with course names
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 grades:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Grade'
 */
moodleRouter.get("/grades", async (req: Request, res: Response) => {
  try {
    const { year, semester } = req.query;
    const service = await getMoodleService();
    const userId = await getUserId();
    const data = await service.getGrades(userId);

    if (year || semester) {
      data.grades = data.grades.filter((grade: any) => 
        matchesYearAndSemester(grade.course_name || "", year as string, semester as string)
      );
    }

    res.json(data);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/assignments:
 *   get:
 *     summary: Get assignments to submit
 *     tags: [Moodle]
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [completed, not_completed]
 *         description: Filter assignments by status (based on deadline)
 *       - in: query
 *         name: year
 *         schema:
 *           type: string
 *         description: Filter assignments by year
 *       - in: query
 *         name: semester
 *         schema:
 *           type: string
 *         description: Filter assignments by semester
 *       - in: query
 *         name: sortByDate
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort assignments by duedate
 *       - in: query
 *         name: dateFrom
 *         schema:
 *           type: number
 *         description: Filter assignments with duedate >= dateFrom
 *       - in: query
 *         name: dateTo
 *         schema:
 *           type: number
 *         description: Filter assignments with duedate <= dateTo
 *       - in: query
 *         name: sortByStatus
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *         description: Sort assignments by completion status
 *     responses:
 *       200:
 *         description: List of assignments
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Assignment'
 */
moodleRouter.get("/assignments", async (req: Request, res: Response) => {
  try {
    const { status, year, semester, sortByDate, dateFrom, dateTo, sortByStatus } = req.query;
    const service = await getMoodleService();
    const userId = await getUserId();
    let assignments = await service.getAssignments(userId);

    const now = Math.floor(Date.now() / 1000);

    assignments = assignments.filter((assign: any) => {
      if (!matchesYearAndSemester(assign.courseName || "", year as string, semester as string)) {
        return false;
      }

      if (status) {
        const isPast = assign.duedate < now;
        if (status === "completed" && !isPast) return false;
        if (status === "not_completed" && isPast) return false;
      }
      
      if (dateFrom && assign.duedate < Number(dateFrom)) return false;
      if (dateTo && assign.duedate > Number(dateTo)) return false;

      return true;
    });

    if (sortByDate || sortByStatus) {
      assignments.sort((a: any, b: any) => {
        if (sortByStatus) {
          const aCompleted = a.duedate < now ? 1 : 0;
          const bCompleted = b.duedate < now ? 1 : 0;
          if (aCompleted !== bCompleted) {
            return sortByStatus === 'asc' ? aCompleted - bCompleted : bCompleted - aCompleted;
          }
        }
        if (sortByDate) {
          return sortByDate === 'asc' ? a.duedate - b.duedate : b.duedate - a.duedate;
        }
        return 0;
      });
    }

    res.json(assignments);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/assignments/{assignId}/status:
 *   get:
 *     summary: Get assignment submission status
 *     tags: [Moodle]
 *     parameters:
 *       - in: path
 *         name: assignId
 *         required: true
 *         schema:
 *           type: number
 *     responses:
 *       200:
 *         description: Assignment submission status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
moodleRouter.get("/assignments/:assignId/status", async (req: Request, res: Response) => {
  try {
    const { assignId } = req.params;
    const service = await getMoodleService();
    const userId = await getUserId();
    const status = await service.getAssignmentSubmissionStatus(Number(assignId), userId);
    res.json(status);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/assignments/{assignId}/submission:
 *   post:
 *     summary: Save assignment submission
 *     tags: [Moodle]
 *     parameters:
 *       - in: path
 *         name: assignId
 *         required: true
 *         schema:
 *           type: number
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               text:
 *                 type: string
 *               fileItemId:
 *                 type: number
 *     responses:
 *       200:
 *         description: Submission saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
moodleRouter.post("/assignments/:assignId/submission", async (req: Request, res: Response) => {
  try {
    const { assignId } = req.params;
    const { text, fileItemId } = req.body;
    const service = await getMoodleService();
    // note: file upload to draft area (fileItemId) usually requires another endpoint `core_files_upload`, 
    // but here we just pass the fileItemId if the client has already uploaded it.
    const result = await service.saveAssignmentSubmission(Number(assignId), text, fileItemId ? Number(fileItemId) : undefined);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/statistics:
 *   get:
 *     summary: Get overall course progress statistics
 *     tags: [Moodle]
 *     responses:
 *       200:
 *         description: Statistics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total:
 *                   type: number
 */
moodleRouter.get("/statistics", async (req: Request, res: Response) => {
  try {
    const service = await getMoodleService();
    const userId = await getUserId();
    const courses = await service.getCourses(userId);

    const total = courses.length;

    res.json({
      total
    });
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/events:
 *   get:
 *     summary: Get upcoming course events
 *     tags: [Moodle]
 *     responses:
 *       200:
 *         description: List of upcoming events
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Event'
 */
moodleRouter.get("/events", async (req: Request, res: Response) => {
  try {
    const service = await getMoodleService();
    const userId = await getUserId();
    const events = await service.getUpcomingEvents(userId);
    res.json(events);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/notifications:
 *   get:
 *     summary: Get user notifications
 *     tags: [Moodle]
 *     responses:
 *       200:
 *         description: List of notifications and unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *                 unreadCount:
 *                   type: number
 */
moodleRouter.get("/notifications", async (req: Request, res: Response) => {
  try {
    const service = await getMoodleService();
    const userId = await getUserId();
    const notifications = await service.getNotifications(userId);
    res.json(notifications);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});

/**
 * @openapi
 * /moodle/files/upload:
 *   post:
 *     summary: Upload a file to Moodle draft area
 *     tags: [Moodle]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               filename:
 *                 type: string
 *               filebase64:
 *                 type: string
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   itemid:
 *                     type: number
 */
moodleRouter.post("/files/upload", async (req: Request, res: Response) => {
  try {
    const { filename, filebase64 } = req.body;
    if (!filename || !filebase64) {
      throw new Error("Missing filename or filebase64");
    }

    const service = await getMoodleService();
    const result = await service.uploadFile(filename, filebase64);
    res.json(result);
  } catch (error: any) {
    logger.error(error);
    res.status(400).json({ error: error.message });
  }
});
