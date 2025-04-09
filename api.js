require("dotenv").config();

const express = require("express");
const { google } = require("googleapis");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets", // acceso completo a Sheets
  "https://www.googleapis.com/auth/drive"         // acceso completo a archivos en Drive
];

const auth = new google.auth.GoogleAuth({
  keyFile: "excelapi-454722-82e323a4937d.json",
  scopes: SCOPES,
});

const sheets = google.sheets({ version: "v4", auth });
const drive = google.drive({ version: "v3", auth });
const cron = require("node-cron");
const axios = require("axios");

const gradeFolders = {
  "1": process.env.GRADE_1,
  "2": process.env.GRADE_2,
  "3": process.env.GRADE_3,
  "4": process.env.GRADE_4,
  "5": process.env.GRADE_5,
  "6": process.env.GRADE_6,
};

const { guardarCache, leerCache } = require("./cacheService");

//Conteo total de datos del cache
app.get("/api/total-estudiantes", (req, res) => {
  const cache = leerCache();
  res.json({ total: cache.length });
});

//Conteo por grados para la grafica circular
app.get("/api/estadisticas/grados", (req, res) => {
  const { leerCache } = require("./cacheService");
  const cache = leerCache();

  const conteo = {
    "1": 0,
    "2": 0,
    "3": 0,
    "4": 0,
    "5": 0,
    "6": 0,
  };

  cache.forEach(est => {
    const gradoOriginal = String(est.grado || "").trim();
    const gradoNormalizado = gradoOriginal.replace(/[^1-6]/g, ""); // solo grados 1 a 6

    if (conteo[gradoNormalizado] !== undefined) {
      conteo[gradoNormalizado]++;
    } else {
      console.warn("⚠️ Grado inválido encontrado:", gradoOriginal);
    }
  });

  console.log("✅ Conteo por grado:", conteo);

  res.json({
    success: true,
    labels: [
      "1° Grado", "2° Grado", "3° Grado",
      "4° Grado", "5° Grado", "6° Grado",
    ],
    data: [
      conteo["1"],
      conteo["2"],
      conteo["3"],
      conteo["4"],
      conteo["5"],
      conteo["6"],
    ],
  });
});

// Middleware para manejar errores de CORS y obtener datos de Google Sheets
app.get("/data/:grade/:section", async (req, res) => {
  try {
    const grade = req.params.grade;
    const section = req.params.section.toUpperCase();

    const folderId = gradeFolders[grade];
    if (!folderId) return res.status(400).json({ error: "Grado no válido" });

    const fileName = `${section}`;

    const driveResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet' and name='${fileName}'`,
      fields: "files(id, name)",
    });

    const files = driveResponse.data.files;
    if (!files.length) {
      return res.status(404).json({ error: `No se encontró el archivo "${fileName}" en el grado ${grade}` });
    }

    const sheetId = files[0].id;

    const sheetsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "A2:E",
    });

    const rows = sheetsResponse.data.values || [];

    res.json({
      grade,
      section,
      fileName,
      data: rows,
    });

  } catch (error) {
    console.error("❌ Error al obtener datos:", error.message);
    res.status(500).json({ error: "Error al obtener los datos" });
  }
});

// Ruta API para obtener datos desde JavaScript (students.ejs)
app.get("/api/data/:grade/:section", async (req, res) => {
  try {
    const grade = req.params.grade;
    const section = req.params.section.toUpperCase();

    const folderId = gradeFolders[grade];
    if (!folderId) return res.status(400).json({ success: false, error: "Grado no válido" });

    const fileName = section;

    // Buscar el archivo en la carpeta correspondiente
    const driveResponse = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: 'files(id, name)',
    });

    const files = driveResponse.data.files;
    if (!files.length) {
      return res.status(404).json({ success: false, error: `No se encontró el archivo "${fileName}" en el grado ${grade}` });
    }

    const sheetId = files[0].id;

    // Leer la hoja Matriculas para obtener lista
    const sheetName = 'Matriculas';

    const sheetsResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:B`,
    });

    const rows = sheetsResponse.data.values || [];

    const data = rows
    .filter(row => row.length >= 2)
    .map((row, index) => ({
      numero: index + 1,
      estudiante: row[1] || '',
    }));

    res.json({ success: true, data });
    // console.log("🔍 Rows recibidas:", rows);
  } catch (error) {
    console.error("❌ Error al obtener datos de hoja:", error.message);
    res.status(500).json({ success: false, error: "Error al obtener la lista de estudiantes." });
  }
});

app.post("/api/asistencia", async (req, res) => {

  const { grado, seccion, fecha, asistencia } = req.body;

  try {
    const folderId = gradeFolders[grado];
    if (!folderId) return res.status(400).json({ success: false, message: "Grado no válido" });

    const fileName = seccion.toUpperCase();
    const driveRes = await drive.files.list({
      q: `'${folderId}' in parents and name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id)",
    });

    if (!driveRes.data.files.length) {
      return res.status(404).json({ success: false, message: "Archivo no encontrado" });
    }

    const sheetId = driveRes.data.files[0].id;
    const sheetName = "Asistencias Diarias";

    // Verificar si la hoja existe
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
    const hojaExiste = spreadsheet.data.sheets.some(s => s.properties.title === sheetName);

    if (!hojaExiste) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: {
          requests: [{
            addSheet: { properties: { title: sheetName } }
          }]
        }
      });

      // Opcional: agregar encabezado si se crea la hoja
      await sheets.spreadsheets.values.update({
        spreadsheetId: sheetId,
        range: `${sheetName}!A1:E1`,
        valueInputOption: "USER_ENTERED",
        requestBody: {
          values: [["Nº", "Estudiante", "Estado", "Fecha", "Observación"]]
        }
      });
    }

    // 1. Leer todas las filas existentes de "Asistencias Diarias"
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${sheetName}!A2:E`,
    });

    const yaRegistrados = existing.data.values || [];

    // 2. Crear lista de alumnos ya registrados hoy
    const yaHoy = yaRegistrados.filter(fila => fila[3] === fecha);
    const nombresYaMarcados = yaHoy.map(fila => fila[1]);

    // 3. Validar duplicados o estados vacíos
    for (const alumno of asistencia) {
      if (!["Presente", "Ausente", "Justificado"].includes(alumno.estado)) {
        return res.status(400).json({
          success: false,
          message: `El alumno "${alumno.estudiante}" no tiene un estado válido.`,
        });
      }

      if (nombresYaMarcados.includes(alumno.estudiante)) {
        return res.status(400).json({
          success: false,
          message: `Ya se registró la asistencia de "${alumno.estudiante}" para hoy.`,
        });
      }
    }

    // Limite de hora de registro de las asistencias
    const horaActual = new Date().getHours();
    if (horaActual >= 10) {
      return res.status(403).json({
        success: false,
        message: "El registro de asistencia solo está permitido antes de las 10:00 AM.",
      });
    }

    // Formatear las filas a insertar
    const filas = asistencia.map(item => [
      item.numero,
      item.estudiante,
      item.estado,
      fecha,
      item.observacion || ""
    ]);

    // Insertar en la hoja
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: `${sheetName}!A:E`,
      valueInputOption: "USER_ENTERED",
      insertDataOption: "INSERT_ROWS",
      requestBody: {
        values: filas
      }
    });

    res.json({ success: true, message: "Asistencia guardada correctamente" });

  } catch (error) {
    console.error("❌ Error al guardar asistencia:", error.response?.data || error.message, error);
    res.status(500).json({ success: false, message: "Error al guardar la asistencia" });
  }  
});

app.get("/api/buscar-alumno", (req, res) => {
  const q = (req.query.q || "").toUpperCase().trim();
  if (!q) return res.status(400).json({ success: false, message: "Búsqueda vacía" });

  const cache = leerCache();

  const resultados = cache.filter(a =>
    a.nombre.toUpperCase().includes(q) || a.dni.toLowerCase().includes(q)
  );

  res.json({ success: true, resultados });
});

app.get("/api/actualizar-cache", async (req, res) => {
  const alumnos = [];

  for (const [grado, folderId] of Object.entries(gradeFolders)) {
    const driveResponse = await drive.files.list({
      q: `'${folderId}' in parents and mimeType='application/vnd.google-apps.spreadsheet'`,
      fields: "files(id, name)",
    });

    for (const archivo of driveResponse.data.files) {
      const sheetId = archivo.id;
      const seccion = archivo.name;

      try {
        const sheetResponse = await sheets.spreadsheets.values.get({
          spreadsheetId: sheetId,
          range: "Matriculas!A2:C", // A: Nº, B: Nombre, C: DNI
        });

        const rows = sheetResponse.data.values || [];

        rows.forEach(row => {
          const nombre = row[1] || "";
          const dni = row[0] || "";
          alumnos.push({ nombre, dni, grado, seccion });
        });
      } catch (err) {
        console.warn(`⚠️ Error en ${grado} "${seccion}":`, err.message);
      }
    }
  }

  guardarCache(alumnos);
  res.json({ success: true, message: `Se guardaron ${alumnos.length} registros en caché.` });
});

// Tarea para actualizar el cache cada 12 horas (a las 6am y 6pm)
// cron.schedule("0 6,18 * * *", async () => {
//   try {
//     console.log("🕒 Ejecutando actualización automática del caché...");
//     const res = await axios.get("http://localhost:3001/api/actualizar-cache");
//     console.log("✅", res.data.message);
//   } catch (err) {
//     console.error("❌ Error al actualizar caché automáticamente:", err.message);
//   }
// });

app.listen(PORT, () => {
  console.log(`✅ API corriendo en http://localhost:${PORT}`);
});