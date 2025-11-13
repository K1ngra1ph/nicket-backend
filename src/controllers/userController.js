const User = require("../models/User");

exports.registerUser = async (req, res) => {
  try {
    const { name, email, phone, eventValue } = req.body;

    if (!name || !email || !phone || !eventValue)
      return res.status(400).json({ error: "Missing required fields" });

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: "User already exists" });

    const user = await User.create({ name, email, phone, eventValue });
    res.status(200).json({ success: true, message: "User registered successfully", user });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};