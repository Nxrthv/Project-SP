const fs = require("fs");
const path = require("path");
const CACHE_FILE = path.join(__dirname, "alumnos_cache.json");

function guardarCache(datos) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(datos, null, 2));
}

function leerCache() {
  if (!fs.existsSync(CACHE_FILE)) return [];
  const data = fs.readFileSync(CACHE_FILE);
  return JSON.parse(data);
}

module.exports = { guardarCache, leerCache };