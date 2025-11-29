module.exports = function normalizeSelectedNumbers(value) {
  console.log("🟦 [DEBUG] Raw selectedNumbers received:", value);

  if (!value) return [];
  if (Array.isArray(value)) return value.map(n => Number(n)).filter(n => !isNaN(n));
  if (typeof value === "string") return value.split(",").map(n => Number(n)).filter(n => !isNaN(n));
  return [Number(value)].filter(n => !isNaN(n));
};
