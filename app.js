// 
require("dotenv").config();
const express = require("express");
const path = require("path");
const { google } = require("googleapis");
const cors = require("cors");
const cron = require("node-cron");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT;
// const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware base
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// Configuración de vistas
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Autenticación con Google API
const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive",
];

const auth = new google.auth.GoogleAuth({
  keyFile: "excelapi-454722-82e323a4937d.json",
  scopes: SCOPES,
});

//
const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });

// IDs de carpetas por grado
const gradeFolders = {
  "1": process.env.GRADE_1,
  "2": process.env.GRADE_2,
  "3": process.env.GRADE_3,
  "4": process.env.GRADE_4,
  "5": process.env.GRADE_5,
  "6": process.env.GRADE_6,
};

const { guardarCache, leerCache } = require("./cacheService");

//---------------------------------------------
// Rutas del servidor (Frontend)
//---------------------------------------------

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.get("/", (req, res) => {
  const cache = leerCache();
  const totalEstudiantes = cache.length;

  res.render("dashboard", {
    totalEstudiantes,
  });
});

app.get("/students", (req, res) => {
  res.render("students", {
    data: null,
    section: null,
    grade: null,
    error: null,
  });
});

app.get("/assists", (req, res) => {
  res.render("assists", {
    data: null,
  });
});

app.get("/error_404", (req, res) => {
  res.render("reusables/error_404");
});

//---------------------------------------------
// Rutas API
//---------------------------------------------

// Total de estudiantes registrados (desde el cache)
app.get("/api/total-estudiantes", (req, res) => {
  const cache = leerCache();
  res.json({ total: cache.length });
});

// Conteo de estudiantes por grado para gráfico circular
app.get("/api/estadisticas/grados", (req, res) => {
  const cache = leerCache();
  const conteo = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0, "6": 0 };

  cache.forEach(est => {
    const grado = String(est.grado || "").trim().replace(/[^1-6]/g, "");
    if (conteo[grado] !== undefined) conteo[grado]++;
  });

  res.json({
    success: true,
    labels: ["1° Grado", "2° Grado", "3° Grado", "4° Grado", "5° Grado", "6° Grado"],
    data: Object.values(conteo),
  });
});

// Obtener datos de matrícula para una sección específica
app.get("/api/data/:grade/:section", async (req, res) => {
  try {
    const grade = req.params.grade;
    const section = req.params.section.toUpperCase();
    const folderId = gradeFolders[grade];

    if (!folderId) return res.status(400).json({ error: "Grado no válido" });

    const fileName = section;
    const driveRes = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id, name)",
    });

    const files = driveRes.data.files;
    if (!files.length) return res.status(404).json({ error: "Archivo no encontrado" });

    const sheetId = files[0].id;
    const sheetRes = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Matriculas!A2:E",
    });

    const data = sheetRes.data.values || [];

    res.json({ success: true, data });
  } catch (err) {
    console.error("❌ Error al obtener estudiantes:", err.message);
    res.status(500).json({ error: "Error interno" });
  }
});

//Realiza la consulta usando la ruta anterior, luego renderiza los datos obtenidos en la vista students.ejs
app.get("/data/:grade/:section", async (req, res) => {
  try {
    const { grade, section } = req.params;
    const response = await axios.get(`http://localhost:${PORT}/api/data/${grade}/${section}`);
    const estudiantes = response.data.data;

    res.render("students", {
      currentPath: "/estudiantes",
      grade,
      section,
      data: estudiantes,
      error: null,
    });
  } catch (error) {
    console.error("❌ Error al obtener datos:", error.message);
    res.render("students", {
      currentPath: "/estudiantes",
      grade: req.params.grade,
      section: req.params.section,
      data: null,
      error: "Error al obtener la lista de estudiantes",
    });
  }
});

// Registrar asistencia en la hoja de cálculo
app.post("/api/assists", async (req, res) => {
  const { grado, seccion, fecha, asistencia } = req.body;
  try {
    const folderId = gradeFolders[grado];
    const fileName = seccion.toUpperCase();
    const driveRes = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id)",
    });

    if (!driveRes.data.files.length) return res.status(404).json({ message: "Archivo no encontrado" });
    const sheetId = driveRes.data.files[0].id;
    const sheetName = "Asistencias Diarias";

    // Crear hoja si no existe
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const hojaExiste = spreadsheet.data.sheets.some(s => s.properties.title === sheetName);
    if (!hojaExiste) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests: [{ addSheet: { properties: { title: sheetName } } }] },
      });
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: "USER_ENTERED",
        requestBody: { values: [["Nº", "Estudiante", "Estado", "Fecha", "Observación"]] },
      });
    }

    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:E`,
    });

    const yaRegistrados = existing.data.values || [];
    const yaHoy = yaRegistrados.filter(f => f[3] === fecha);
    const nombresYaMarcados = yaHoy.map(f => f[1]);

    for (const alumno of asistencia) {
      if (!["Presente", "Ausente", "Justificado"].includes(alumno.estado)) {
        return res.status(400).json({ message: `Estado inválido para ${alumno.estudiante}` });
      }
      if (nombresYaMarcados.includes(alumno.estudiante)) {
        return res.status(400).json({ message: `Ya se registró a ${alumno.estudiante}` });
      }
    }

    if (new Date().getHours() >= 10) {
      return res.status(403).json({ message: "Solo se permite registrar hasta las 10:00 AM" });
    }

    const filas = asistencia.map(a => [a.numero, a.estudiante, a.estado, fecha, a.observacion || ""]);
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values: filas },
    });

    res.json({ success: true, message: "Asistencia registrada" });
  } catch (err) {
    console.error("❌ Error al registrar asistencia:", err.message);
    res.status(500).json({ message: "Error al registrar asistencia" });
  }
});

// Búsqueda global de estudiantes en el cache
app.get("/api/buscar-alumno", (req, res) => {
  const q = (req.query.q || "").toUpperCase().trim();
  if (!q) return res.status(400).json({ success: false, message: "Búsqueda vacía" });

  const cache = leerCache();
  const resultados = cache.filter(a => a.nombre.toUpperCase().includes(q) || a.dni.includes(q));
  res.json({ success: true, resultados });
});

// Actualizar cache desde las hojas de cálculo
app.get("/api/actualizar-cache", async (req, res) => {
  // const clave = req.query.key;
  // if (process.env.NODE_ENV === "production" && clave !== process.env.CACHE_KEY) {
  //   return res.status(403).json({ success: false, message: "Acceso denegado" });
  // }
  
  const alumnos = [];

  for (const [grado, folderId] of Object.entries(gradeFolders)) {
    const driveResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id, name)" ,
    });

    for (const archivo of driveResponse.data.files) {
      const sheetId = archivo.id;
      const seccion = archivo.name;

      try {
        const sheetResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "Matriculas!A2:E",
        });

        const rows = sheetResponse.data.values || [];
        rows.forEach(row => {
          const nombre = (row[1] || "").trim();
          const dni = (row[0] || "").trim();
          alumnos.push({ nombre, dni, grado, seccion });
        });
      } catch (err) {
        console.warn(`⚠️ Error en hoja "${seccion}" del grado ${grado}:`, err.message);
      }
    }
  }
  guardarCache(alumnos);
  res.json({ success: true, message: `Se guardaron ${alumnos.length} registros en caché.` });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// http://localhost:8080/api/actualizar-cache