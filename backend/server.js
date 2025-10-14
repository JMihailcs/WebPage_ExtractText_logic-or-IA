import express from "express";
import cors from "cors";
import procesarTextoRoutes from "./routes/procesarTextoRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/procesarTexto", procesarTextoRoutes);

app.listen(4000, () => {
  console.log("Servidor backend en http://localhost:4000");
});
