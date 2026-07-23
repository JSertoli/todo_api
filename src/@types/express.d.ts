export { };

declare global {
  namespace Express {
    interface Request {
      /** id do usuário autenticado */
      userId?: string;
    }
  }
}
