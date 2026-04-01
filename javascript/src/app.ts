import express from "express";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import authRouter from "./routes/auth";
import clientsRouter from "./routes/clients";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/** Swagger / OpenAPI configuration */
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "InsureCRM API",
      version: "1.0.0",
      description:
        "REST API for InsureCRM — a CRM platform for insurance agencies. Manages authentication, client records, and policy tracking.",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    tags: [
      { name: "Auth", description: "Authentication and user management" },
      { name: "Clients", description: "Client and policy management" },
    ],
  },
  apis: ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/openapi.json", (_req, res) => res.json(swaggerSpec));

/** Mount route modules */
app.use("/api/auth", authRouter);
app.use("/api/clients", clientsRouter);

/** Health check */
app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "insurecrm-api", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`InsureCRM API running on http://localhost:${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
  console.log(`OpenAPI spec: http://localhost:${PORT}/openapi.json`);
});

export default app;
