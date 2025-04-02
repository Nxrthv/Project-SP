const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

const API_URL = "http://localhost:3001/data";

// Estudiantes
app.get("/", (req, res) => {
  res.render("index", { data: null, grade: null, section: null, error: null });
});

// Asistencias
app.get("/assists", (req, res) => {
  res.render("assists");
});

// Página de error 404
app.get("/error_404", (req, res) => {
  res.render("reusables/error_404");
});

// Obtener datos por grado y sección
app.get("/data/:grade/:section", async (req, res) => {
  try {
    const grade = req.params.grade;
    const section = req.params.section.toUpperCase();

    const response = await axios.get(`${API_URL}/${grade}/${section}`);

    res.render("index", {
      grade,
      section,
      data: response.data.data,
      error: null,
    });
  } catch (error) {
    console.error("❌ Error al obtener datos:", error.message);
    res.render("index", {
      data: null,
      grade: req.params.grade,
      section: req.params.section,
      error: "Error al obtener los datos",
    });
  }
});

// Ruta API para asistir desde JavaScript (assists.ejs)
// app.get("/api/data/:grade/:section", async (req, res) => {
//   try {
//     const grade = req.params.grade;
//     const section = req.params.section.toUpperCase();

//     const response = await axios.get(`${API_URL}/${grade}/${section}`);
//     res.json({
//       success: true,
//       data: response.data.data,
//     });
//   } catch (error) {
//     console.error("❌ Error al obtener datos de API:", error.message);
//     res.json({ success: false, error: "No se pudo obtener la lista de estudiantes." });
//   }
// });

// Ruta API para obtener datos desde JavaScript (index.ejs)
app.get("/api/data/:grade/:section", async (req, res) => {
  try {
    const { grade, section } = req.params;
    const response = await axios.get(`http://localhost:3001/api/data/${grade}/${section}`);
    res.json({ success: true, data: response.data.data });
  } catch (error) {
    console.error("❌ Error al obtener datos de API:", error.message);
    res.status(500).json({ success: false, error: "No se pudo obtener la lista de estudiantes." });
  }
});

//Registro de Asistencia
// app.post("/api/asistencia", async (req, res) => {
//   try {
//     const { grado, seccion, fecha, asistencia } = req.body;
//     const folderId = gradeFolders[grado]; // Asegúrate que esté definido en tu config

//     if (!folderId) return res.status(400).json({ success: false, message: "Grado no válido" });

//     const fileName = seccion.toUpperCase();

//     // Buscar el archivo de sección en el Drive
//     const driveRes = await drive.files.list({
//       q: `'${folderId}' in parents and name='${fileName}' and mimeType='application/vnd.google-apps.spreadsheet'`,
//       fields: "files(id)",
//     });

//     if (!driveRes.data.files.length) {
//       return res.status(404).json({ success: false, message: "Archivo no encontrado" });
//     }

//     const sheetId = driveRes.data.files[0].id;

//     // Verificar si la hoja "Asistencias Diarias" existe
//     const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
//     const hojaExiste = spreadsheet.data.sheets.some(s => s.properties.title === "Asistencias Diarias");

//     if (!hojaExiste) {
//       await sheets.spreadsheets.batchUpdate({
//         spreadsheetId: sheetId,
//         requestBody: {
//           requests: [
//             {
//               addSheet: {
//                 properties: {
//                   title: "Asistencias Diarias",
//                 },
//               },
//             },
//             {
//               updateCells: {
//                 range: {
//                   sheetId: spreadsheet.data.sheets.length,
//                   startRowIndex: 0,
//                   endRowIndex: 1,
//                   startColumnIndex: 0,
//                   endColumnIndex: 5,
//                 },
//                 rows: [{
//                   values: ["Nº", "Estudiante", "Estado", "Fecha", "Observación"].map(value => ({
//                     userEnteredValue: { stringValue: value }
//                   }))
//                 }],
//                 fields: "userEnteredValue",
//               },
//             }
//           ]
//         }
//       });
//     }

//     // Preparar los datos en orden
//     const filas = asistencia.map(item => [
//       item.numero.toString(),
//       item.estudiante,
//       item.estado,
//       fecha,
//       item.observacion || ""
//     ]);

//     // Insertar las filas
//     await sheets.spreadsheets.values.append({
//       spreadsheetId: sheetId,
//       range: "Asistencias Diarias!A:E",
//       valueInputOption: "USER_ENTERED",
//       insertDataOption: "INSERT_ROWS",
//       requestBody: {
//         values: filas
//       }
//     });

//     res.json({ success: true, message: "Asistencia guardada correctamente." });
//   } catch (error) {
//     console.error("❌ Error al guardar asistencia:", error.message);
//     res.status(500).json({ success: false, message: "Error al guardar la asistencia." });
//   }
// });

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});