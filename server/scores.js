// Single-player records in MySQL. Without DB_HOST the game still runs; saving scores just answers 503.
// Env: DB_HOST, DB_PORT (default 3306), DB_NAME, DB_USER, DB_PASSWORD
import mysql from "mysql2/promise";
import { LEVEL_PAIRS, NAME_MAX_LENGTH } from "./game.js";

const TOP = 10;
const MAX_TIME_MS = 24 * 60 * 60 * 1000;

// shortcut: the browser reports time and moves, so a hand-made request can fake a score.
// This only rejects impossible ones; stopping cheaters means running single player on the server.
export const validateScore = (score) => {
  const { name, level, timeMs, moves } = score ?? {};
  const cleanName = typeof name === "string" ? name.trim() : "";
  const pairs = Object.hasOwn(LEVEL_PAIRS, level) && LEVEL_PAIRS[level];
  if (!cleanName || cleanName.length > NAME_MAX_LENGTH || !pairs) return null;
  // Every pair takes at least one move, and the clock starts at the first flip
  if (!Number.isInteger(moves) || moves < pairs || moves > pairs * 100) return null;
  if (!Number.isInteger(timeMs) || timeMs < pairs * 100 || timeMs > MAX_TIME_MS) return null;
  return { name: cleanName, level, timeMs, moves };
};

const pool = process.env.DB_HOST
  ? mysql.createPool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectionLimit: 5,
      connectTimeout: 5000, // answer the browser before its 10s timeout
    })
  : null;

const ready = pool?.query(`
  CREATE TABLE IF NOT EXISTS scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(${NAME_MAX_LENGTH}) NOT NULL,
    level VARCHAR(10) NOT NULL,
    time_ms INT NOT NULL,
    moves INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX level_rank (level, time_ms, moves)
  )`);
ready?.then(
  () => console.log("Scores: connected to the database"),
  (err) => console.error("Scores: database unavailable:", err.message)
);

export const enabled = () => Boolean(pool);

// Saves the score and returns its id with the level's top 10 (fastest first, fewer moves breaks ties)
export const saveScore = async ({ name, level, timeMs, moves }) => {
  await ready;
  const [result] = await pool.execute(
    "INSERT INTO scores (name, level, time_ms, moves) VALUES (?, ?, ?, ?)",
    [name, level, timeMs, moves]
  );
  const [scores] = await pool.execute(
    `SELECT id, name, time_ms AS timeMs, moves FROM scores WHERE level = ?
     ORDER BY time_ms, moves, id LIMIT ${TOP}`,
    [level]
  );
  return { id: result.insertId, scores };
};
