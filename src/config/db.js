const connectDB = async () => {
  const maxRetries = 5;
  let attempts = 0;

  while (attempts < maxRetries) {
    try {
      await mongoose.connect(process.env.MONGO_URI);
      console.log("✅ MongoDB connected successfully!");
      break;
    } catch (error) {
      attempts++;
      console.error(`❌ MongoDB connection attempt ${attempts} failed:`, error.message);
      if (attempts >= maxRetries) process.exit(1);
      await new Promise(r => setTimeout(r, 3000));
    }
  }
};
