import jwt from "jsonwebtoken";

export const verifyToken = (req, res, next) => {
  const token = req.header("Authorization");
  if (!token) return res.status(401).json({ message: "Access Denied" });

  try {
    const tokenString = token.startsWith("Bearer ") ? token.slice(7, token.length) : token;
    
    const verified = jwt.verify(tokenString, process.env.JWT_SECRET || "nicket_secret_key_123");
    req.user = verified;
    next();
  } catch (err) {
    res.status(400).json({ message: "Invalid Token" });
  }
};

export const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role === "admin") {
      next();
    } else {
      res.status(403).json({ message: "Admin access required" });
    }
  });
};