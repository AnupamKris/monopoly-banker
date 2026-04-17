import { defineApp } from "convex/server";
import monopolyBanker from "./components/monopolyBanker/convex.config.js";

const app = defineApp();
app.use(monopolyBanker);

export default app;
