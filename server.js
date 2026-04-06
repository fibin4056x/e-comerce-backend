const allowedOrigins = [
  "http://localhost:5173",
  "https://e-comercer-frontend.vercel.app",
  "https://solesociety-6114e04of-fibins-projects-3db35d72.vercel.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("CORS blocked: " + origin));
    }
  },
  credentials: true,
}));