const fs = require("fs");
const path = require("path");
const CACHE_FILE = path.join(__dirname, "alumnos_cache.json");

const guardarCache = (data) => {
  const fs = require("fs");
  fs.writeFileSync("cache.json", JSON.stringify(data, null, 2), "utf8"); // sobrescribe el archivo
};

function leerCache() {
  if (!fs.existsSync(CACHE_FILE)) return [];
  const data = fs.readFileSync(CACHE_FILE);
  return JSON.parse(data);
}

module.exports = { guardarCache, leerCache };