require("dotenv").config(); // Зареждаме .env
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    methods: ["GET", "POST"],
  })
);
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Конфигурация от .env
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const PORT = process.env.PORT || 5000;

// Setup SQLite база
const db = new sqlite3.Database("./incidents.db");
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL,
      lng REAL,
      description TEXT,
      mediaUrl TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Multer за файлове
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// GET всички инциденти
app.get("/incidents", (req, res) => {
  db.all("SELECT * FROM incidents ORDER BY timestamp DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// POST нов инцидент
app.post("/incidents", upload.single("media"), (req, res) => {
  const { lat, lng, description } = req.body;
  const mediaUrl = req.file
    ? `${BACKEND_URL}/uploads/${req.file.filename}`
    : null;

  const stmt = db.prepare(
    "INSERT INTO incidents (lat, lng, description, mediaUrl) VALUES (?, ?, ?, ?)"
  );
  stmt.run(lat, lng, description, mediaUrl, function (err) {
    if (err) return res.status(500).json({ error: err.message });

    db.get(
      "SELECT * FROM incidents WHERE id = ?",
      [this.lastID],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
      }
    );
  });
  stmt.finalize();
});

// Стартиране на сървъра
app.listen(PORT, () => console.log(`Server running on ${BACKEND_URL}`));
