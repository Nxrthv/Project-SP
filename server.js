const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

//La API se ejecuta el paralelo con el server (Temporal por depuracion)
const API_URL = "http://localhost:3001/data";

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// Ruta Dashboard
app.get("/", async (req, res) => {
  const response = await axios.get("http://localhost:3001/api/total-estudiantes");
  const total = response.data.total;

  res.render("dashboard", {
    totalEstudiantes: total,
  });
});

// Ruta Estudiantes
app.get("/students", (req, res) => {
  res.render("students", { data: null, grade: null, section: null, error: null });
});

// Ruta Asistencias
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
    //Datos de grado y seccion requeridos para la funcion, los cuales son obtenidos desde el frontend
    const grade = req.params.grade;
    const section = req.params.section.toUpperCase();
    
    //Al seleccionar ambos valores se realiza la ejecucion de la peticion a la API
    const response = await axios.get(`${API_URL}/${grade}/${section}`);

    res.render("students", {
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

//Actualizar el cache al iniciar el servidor
const { leerCache } = require("./cacheService");

if (leerCache().length === 0) {
  console.log("🟡 Caché vacío al iniciar. Generando...");
  axios.get("http://localhost:3001/api/actualizar-cache");
}

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});