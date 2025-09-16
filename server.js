import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { google } from "googleapis";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(bodyParser.json());

// Serve static files (frontend build output)
app.use(express.static(path.join(__dirname, "dist")));

// Google Sheets config
const SHEET_ID = process.env.SHEET_ID;
const SHEET_SUBJECTS = "Subjects";
const SHEET_ACTIVITIES = "Activities";

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const sheets = google.sheets({ version: "v4", auth });

// ---------------- API ----------------
// Save data
app.post("/api/save", async (req, res) => {
  try {
    const { subjects, activities } = req.body;

    const subjectsValues = subjects.map((s) => [
      s.id,
      s.title,
      s.subtitle || "",
      s.level,
      s.symbol,
      s.time || "",
    ]);

    const activitiesValues = [];
    for (const date in activities) {
      activities[date].forEach((a) => {
        activitiesValues.push([
          date,
          a.id,
          a.title,
          a.subtitle || "",
          a.level,
          a.symbol,
          a.time || "",
        ]);
      });
    }

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: SHEET_SUBJECTS,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: SHEET_SUBJECTS,
      valueInputOption: "RAW",
      requestBody: { values: subjectsValues },
    });

    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: SHEET_ACTIVITIES,
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: SHEET_ACTIVITIES,
      valueInputOption: "RAW",
      requestBody: { values: activitiesValues },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SAVE ERROR:", err);
    res.status(500).json({ error: "Failed to save data" });
  }
});

// Load data
app.get("/api/data", async (req, res) => {
  try {
    const subjectsRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_SUBJECTS,
    });
    const activitiesRes = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: SHEET_ACTIVITIES,
    });

    const subjects = (subjectsRes.data.values || []).map((r) => ({
      id: r[0],
      title: r[1],
      subtitle: r[2],
      level: r[3],
      symbol: r[4],
      time: r[5],
    }));

    const activities = {};
    (activitiesRes.data.values || []).forEach((r) => {
      const date = r[0];
      const act = {
        id: r[1],
        title: r[2],
        subtitle: r[3],
        level: r[4],
        symbol: r[5],
        time: r[6],
      };
      if (!activities[date]) activities[date] = [];
      activities[date].push(act);
    });

    res.json({ subjects, activities });
  } catch (err) {
    console.error("LOAD ERROR:", err);
    res.status(500).json({ error: "Failed to load data" });
  }
});

// Fallback → serve frontend (ใช้ regex แทน *)
app.get(new RegExp(".*"), (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const PORT = process.env.PORT || 1573;
app.listen(PORT, () =>
  console.log(`✅ Server running on http://localhost:${PORT}`)
);
