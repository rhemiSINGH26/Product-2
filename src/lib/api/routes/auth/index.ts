import { loginRoute } from "./login";
import { registerRoute } from "./register";
import { logoutRoute } from "./logout";
import { sessionRoute } from "./session";

export const authApiRoutes: Record<
  string,
  Record<string, (request: Request) => Promise<Response>>
> = {
  "/api/auth/login": { POST: loginRoute },
  "/api/auth/register": { POST: registerRoute },
  "/api/auth/logout": { POST: logoutRoute },
  "/api/auth/session": { GET: sessionRoute },
};
