import type { NextFunction, Request, Response } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.uid) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  next();
}

export function requireParent(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.uid) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  if (req.session.role !== "parent") {
    res.status(403).json({ error: "Доступ только для родителя" });
    return;
  }
  next();
}

export function requireTeacher(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.uid) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  if (req.session.role !== "teacher") {
    res.status(403).json({ error: "Доступ только для учителя" });
    return;
  }
  next();
}

export function requireDirector(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.uid) {
    res.status(401).json({ error: "Требуется вход" });
    return;
  }
  if (req.session.role !== "director") {
    res.status(403).json({ error: "Доступ только для директора" });
    return;
  }
  next();
}
