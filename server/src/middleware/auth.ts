import type { NextFunction, Request, Response } from "express";

// A single shared PIN is enough here — 1 laptop + 2-3 phones, all trusted
// family/business devices, not a multi-user system that needs real accounts.
const APP_PIN = process.env.APP_PIN;

if (!APP_PIN) {
  throw new Error("APP_PIN environment variable is not set — refusing to start without it.");
}

export function requirePin(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header("x-app-pin");
  if (provided !== APP_PIN) {
    res.status(401).json({ error: "Invalid or missing PIN" });
    return;
  }
  next();
}
