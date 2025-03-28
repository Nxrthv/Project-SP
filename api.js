require("dotenv").config();

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const auth = new google.auth.GoogleAuth({
  keyFile: "excelapi-454722-82e323a4937d.json",
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });

app.get("/data/:section", async (req, res) => {
  try {
    const { section } = req.params;
    const sheetIds = process.env.GOOGLE_SHEET_IDS.split(",");

    const sectionIndex = ["A", "B", "C", "D", "E", "F"].indexOf(section.toUpperCase());
    if (sectionIndex === -1) return res.status(400).json({ error: "Sección no válida" });

    const sheetId = sheetIds[sectionIndex];
    const range = "A2:E"; // Ignorar la primera fila (encabezados)

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range,
    });

    const rows = response.data.values || [];
    res.json({ section, data: rows });

  } catch (error) {
    console.error("❌ Error al obtener datos:", error.message);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ API corriendo en http://localhost:${PORT}`);
});