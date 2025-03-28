const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.use(express.static("public"));

const API_URL = "http://localhost:3001/data";

// Página principal
app.get("/", (req, res) => {
  res.render("index", { data: null, section: null, error: null });
});

// Obtener datos de una sección
app.get("/seccion/:section", async (req, res) => {
  try {
    const section = req.params.section.toUpperCase();
    const response = await axios.get(`${API_URL}/${section}`);
    res.render("index", { data: response.data.data, section, error: null });
  } catch (error) {
    res.render("index", { data: null, section: null, error: "Error al obtener los datos" });
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});