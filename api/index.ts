/**
 * Serverless entry для Vercel: подключаем исходники Express, не dist
 * (после `tsc` dist не всегда попадает в бандл функции).
 */
import app from "../src/app";

export default app;
