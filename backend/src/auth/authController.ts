import { Router } from "express";
import { AuthService } from "./AuthService.ts";
export const router = Router();
const authService = new AuthService();

/**
 * @openapi
 * /login:
 *   post:
 *     summary: Login to Moodle and save credentials
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 userID:
 *                   type: string
 *       500:
 *         description: Internal Server Error
 */
router.post("/", async (req, res) => {
  const { username, password } = req.body;
  try {
    const data = await authService.writeData(username, password);
    res.status(200).json({ token: data.token, userID: data.userId });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
});
