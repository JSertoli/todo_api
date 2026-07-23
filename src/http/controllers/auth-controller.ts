import type { Request, Response } from "express";
import type { AuthService } from "../../application/auth-service.ts";

export class AuthController {
  constructor(private readonly auth: AuthService) { }

  register = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.register(req.body.email, req.body.password);
    res.status(201).json({ user });
  };

  login = async (req: Request, res: Response): Promise<void> => {
    const session = await this.auth.login(req.body.email, req.body.password);
    res.json(session);
  };

  refresh = async (req: Request, res: Response): Promise<void> => {
    const tokens = await this.auth.refresh(req.body.refreshToken);
    res.json(tokens);
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    await this.auth.logout(req.body.refreshToken);
    res.status(204).send();
  };

  me = async (req: Request, res: Response): Promise<void> => {
    const user = await this.auth.getProfile(req.userId!);
    res.json({ user });
  };
}
