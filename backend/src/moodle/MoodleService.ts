import logger from "../utils/logger.ts";
import { normalizeMoodleText, extractYear, extractSemester } from "../utils/moodleFilters.ts";

export interface MoodleConfig {
  baseUrl: string;
  token: string;
}

export class MoodleService {
  private baseUrl: string;
  private token: string;

  constructor(config: MoodleConfig) {
    this.baseUrl = config.baseUrl.endsWith("/")
      ? config.baseUrl.slice(0, -1)
      : config.baseUrl;
    this.token = config.token;
  }

  public async callMoodle(
    wsFunction: string,
    params: Record<string, any> = {}
  ) {
    const url = new URL(`${this.baseUrl}/webservice/rest/server.php`);
    url.searchParams.append("wstoken", this.token);
    url.searchParams.append("wsfunction", wsFunction);
    url.searchParams.append("moodlewsrestformat", "json");

    const buildParams = (prefix: string, obj: any) => {
      if (Array.isArray(obj)) {
        obj.forEach((val, index) => {
          buildParams(`${prefix}[${index}]`, val);
        });
      } else if (typeof obj === "object" && obj !== null) {
        Object.entries(obj).forEach(([subKey, subVal]) => {
          buildParams(`${prefix}[${subKey}]`, subVal);
        });
      } else {
        url.searchParams.append(prefix, String(obj));
      }
    };

    Object.entries(params).forEach(([key, value]) => {
      buildParams(key, value);
    });

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Moodle API error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.exception) {
        throw new Error(`Moodle API Exception: ${data.message}`);
      }
      return data;
    } catch (error) {
      logger.error({ error, wsFunction }, "Error calling Moodle API");
      throw error;
    }
  }

  async getCourses(userId: number) {
    const courses = await this.callMoodle("core_enrol_get_users_courses", {
      userid: userId
    });
    return courses.map((course: any) => ({
      id: course.id,
      fullname: course.fullname,
      shortname: course.shortname,
      summary: normalizeMoodleText(course.summary),
      year: extractYear(course.fullname) || extractYear(course.shortname),
      semester:
        extractSemester(course.fullname) || extractSemester(course.shortname)
    }));
  }

  async getCourseContents(courseId: number) {
    const data = await this.callMoodle("core_course_get_contents", {
      courseid: courseId
    });
    return data;
  }

  async getGrades(userId: number) {
    const [gradesData, courses] = await Promise.all([
      this.callMoodle("gradereport_overview_get_course_grades", {
        userid: userId
      }),
      this.getCourses(userId)
    ]);

    const courseInfoMap = new Map<number, any>(courses.map((c: any) => [c.id, { fullname: c.fullname, year: c.year, semester: c.semester }]));

    return {
      grades: gradesData.grades.map((gradeItem: any) => {
        const info = courseInfoMap.get(gradeItem.courseid);
        return {
          course_name: info?.fullname || `Course ID ${gradeItem.courseid}`,
          grade: gradeItem.grade && !isNaN(Number(gradeItem.grade)) ? parseFloat(gradeItem.grade).toString() : gradeItem.grade,
          rawgrade: gradeItem.rawgrade,
          year: info?.year,
          semester: info?.semester
        };
      })
    };
  }

  async getAssignments(userId: number) {
    const data = await this.callMoodle("mod_assign_get_assignments");
    const assignments: any[] = [];

    data.courses.forEach((course: any) => {
      const year = extractYear(course.fullname) || extractYear(course.shortname);
      const semester =
        extractSemester(course.fullname) || extractSemester(course.shortname);

      course.assignments.forEach((assign: any) => {
        assignments.push({
          id: assign.id,
          courseName: course.fullname,
          name: assign.name,
          duedate: assign.duedate,
          description: normalizeMoodleText(assign.intro),
          year,
          semester
        });
      });
    });

    return assignments;
  }

  async getAssignmentSubmissionStatus(assignId: number, userId: number) {
    const data = await this.callMoodle("mod_assign_get_submission_status", {
      assignid: assignId,
      userid: userId
    });

    const submissionStatus = data?.lastattempt?.submission?.status || 'new';
    const gradingStatus = data?.lastattempt?.gradingstatus;
    let grade = data?.feedback?.grade?.gradefordisplay || data?.feedback?.grade?.grade;

    if (grade && !isNaN(Number(grade))) {
      grade = parseFloat(grade).toString();
    }

    let finalStatus = submissionStatus;
    if (gradingStatus === 'graded') {
      finalStatus = 'graded';
    }

    return {
      status: finalStatus,
      grade: grade
    };
  }

  async saveAssignmentSubmission(assignId: number, text?: string, fileItemId?: number) {
    const params: any = {
      assignid: assignId,
      plugindata: {}
    };

    if (text !== undefined) {
      params.plugindata.onlinetext_editor = {
        text: text,
        format: 1,
        itemid: 0
      };
    }

    if (fileItemId !== undefined) {
      params.plugindata.files_filemanager = fileItemId;
    }

    const data = await this.callMoodle("mod_assign_save_submission", params);
    return data;
  }

  async getUpcomingEvents(userId: number) {
    const data = await this.callMoodle(
      "core_calendar_get_calendar_upcoming_view"
    );
    return data.events.map((event: any) => ({
      id: event.id,
      name: event.name,
      description: normalizeMoodleText(event.description),
      courseName: event.course?.fullname || "Global",
      timestart: event.timestart,
      formattedtime: event.formattedtime,
      eventtype: event.eventtype,
      url: event.url
    }));
  }

  async getNotifications(userId: number) {
    const data = await this.callMoodle(
      "message_popup_get_popup_notifications",
      { useridto: userId }
    );
    return {
      notifications: data.notifications.map((notif: any) => ({
        id: notif.id,
        subject: notif.subject,
        message: normalizeMoodleText(
          notif.fullmessagehtml || notif.fullmessage || notif.smallmessage
        ),
        timecreated: notif.timecreated,
        read: notif.read
      })),
      unreadCount: data.unreadcount
    };
  }

  async uploadFile(filename: string, filebase64: string) {
    const url = `${this.baseUrl}/webservice/upload.php`;
    
    // Extract base64 part if it contains data URL scheme
    const base64Data = filebase64.includes(',') ? filebase64.split(',')[1] : filebase64;
    const buffer = Buffer.from(base64Data, 'base64');
    const blob = new Blob([buffer]);

    const formData = new FormData();
    formData.append('token', this.token);
    formData.append('file_1', blob, filename);

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
         throw new Error(`Upload error: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.exception) {
        throw new Error(`Upload Exception: ${data.message}`);
      }
      return data; // Returns an array like [{ itemid: 1234, component: 'user', ... }]
    } catch (error) {
      logger.error({ error }, "Error uploading file to Moodle");
      throw error;
    }
  }
}
