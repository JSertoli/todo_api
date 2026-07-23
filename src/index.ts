import { env } from "./config.ts";
import { app } from "./container.ts";

app.listen(env.PORT, () => {
  console.log(`API rodando em http://localhost:${env.PORT}`);
});
