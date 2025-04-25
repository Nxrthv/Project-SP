require("dotenv").config();
// const { client_email } = require("./excelapi-454722-42c2bee22cff.json");
// console.log("Cuenta de servicio usada:", client_email);

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

const isProd = process.env.NODE_ENV === "production";

const auth = new google.auth.GoogleAuth({
  scopes: SCOPES,
  ...(isProd
    ? { credentials: JSON.parse(process.env.GOOGLE_CREDENTIALS) }
    : { keyFile: "excelapi-454722-42c2bee22cff.json" })
});

if (process.env.NODE_ENV === "production") {
  const axios = require("axios");
  axios.get("https://excelapi-454722.rj.r.appspot.com/api/actualizar-cache")
    .then(res => console.log("✅ Cache inicial actualizado:", res.data.message))
    .catch(err => console.error("❌ Error actualizando cache en servidor:", err.message));
}

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

// app.get("/teachers", (req, res) => {
//   res.render("teachers", {
//     data: null,
//   });
// });

app.get("/assists", (req, res) => {
  res.render("assists", {
    data: null,
  });
});

app.get("/documents", (req, res) => {
  res.render("documents", {
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

// Obtener datos de docentes desde Google Sheets
app.get("/teachers", async (req, res) => {
  try {
    const sheetId = process.env.TEACHERS;

    if (!sheetId) {
      return res.render("teachers", { teachers: [] });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: "Datos!A2:K",
    });

    const values = response.data.values || [];

    const teachers = values.map((row, index) => ({
      id: index + 1,
      nombre: row[1] || "",
      cargo: row[2] || "",
      grado: row[3] || "",
      seccion: row[4] || "",
      turno: row[5] || "",
      dni: row[6] || "",
      telefono: row[7] || "",
      correo: row[8] || "",
      estado: row[9] || "",
      comision: row[10] || "",
    }));

    res.render("teachers", { teachers });
  } catch (error) {
    console.error("❌ Error al obtener docentes:", error.message);
    res.render("teachers", { teachers: [] });
  }
});

app.post("/api/teachers/edit", async (req, res) => {
  try {
    const { fila, nombre, cargo, grado, seccion, turno, dni, telefono, correo, estado, comision } = req.body;

    if (typeof fila !== "number" || isNaN(fila)) {
      return res.status(400).json({ success: false, message: "Fila no válida" });
    }    

    const sheetId = process.env.TEACHERS;
    const range = `Datos!A${fila + 1}:K${fila + 1}`;

    const values = [[
      fila + 1, nombre, cargo, grado, seccion, turno, dni, telefono, correo, estado, comision
    ]];

    const result = await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values }
    });

    res.json({ success: true, message: "Docente actualizado correctamente" });
  } catch (error) {
    console.error("❌ Error actualizando docente:", error.message);
    res.status(500).json({ success: false, message: "Error actualizando docente" });
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

    // x

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
  const q = (req.query.q || "").trim().toUpperCase();
  if (!q) return res.status(400).json({ success: false, message: "Búsqueda vacía" });

  const cache = leerCache();

  const resultados = [];
  const encontrados = new Set(); // Evitar duplicados por DNI

  for (const alumno of cache) {
    const nombre = alumno.nombre.toUpperCase();
    const dni = alumno.dni;

    if ((nombre.includes(q) || dni.includes(q)) && !encontrados.has(dni)) {
      resultados.push(alumno);
      encontrados.add(dni);
    }

    if (resultados.length >= 50) break; // Limitar resultados
  }

  res.json({ success: true, resultados });
});

// Actualizar cache desde las hojas de cálculo
app.get("/api/actualizar-cache", async (req, res) => {
  const alumnos = [];
  const vistos = new Set(); // Evitar duplicados

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
          range: "Matriculas!A2:E", // A: DNI, B: Nombre
        });

        const rows = sheetResponse.data.values || [];
        rows.forEach(row => {
          const dni = (row[0] || "").trim();
          const nombre = (row[1] || "").trim();
          const clave = `${dni}-${grado}-${seccion}`;

          // Solo agregar si no existe ya esta clave única
          if (dni && nombre && !vistos.has(clave)) {
            vistos.add(clave);
            alumnos.push({ nombre, dni, grado, seccion });
          }
        });
      } catch (err) {
        console.warn(`⚠️ Error en hoja "${seccion}" del grado ${grado}:`, err.message);
      }
    }
  }

  guardarCache(alumnos);
  res.json({ success: true, message: `✅ Se guardaron ${alumnos.length} registros únicos en caché.` });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});

// http://localhost:8080/api/actualizar-cache