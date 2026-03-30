import type { NextFunction, Request, Response } from "express";

type Options = {
  error: string;
  status?: number;
};

/**
 * Обертка для async-хендлеров:
 * - логирует ошибку
 * - возвращает JSON с единым сообщением
 */
export function catchAsync(
  fn: (req: Request, res: Response, _next: NextFunction) => Promise<void>,
  opts: Options
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((e) => {
      console.error(e);
      res.status(opts.status ?? 500).json({ error: opts.error });
    });
  };
}

