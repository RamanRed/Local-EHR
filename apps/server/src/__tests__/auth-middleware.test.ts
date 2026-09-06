import { test, describe } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { authMiddleware, requireRole } from "../middleware/auth.middleware.js";

const TEST_SECRET = "dev-secret";

describe("authMiddleware", () => {
  test("returns 401 if authorization header is missing", () => {
    let statusCode = 0;
    let jsonBody: any = null;
    let nextCalled = false;

    const req: any = { headers: {} };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
      },
    };
    const next = () => {
      nextCalled = true;
    };

    authMiddleware(req, res, next);

    assert.equal(statusCode, 401);
    assert.deepEqual(jsonBody, { message: "Missing or invalid token" });
    assert.equal(nextCalled, false);
  });

  test("attaches decoded user to req and calls next() on valid token", () => {
    const token = jwt.sign({ userId: "u123", role: "DOCTOR" }, TEST_SECRET);
    let nextCalled = false;

    const req: any = {
      headers: { authorization: `Bearer ${token}` },
    };
    const res: any = {
      status() { return this; },
      json() {},
    };
    const next = () => {
      nextCalled = true;
    };

    authMiddleware(req, res, next);

    assert.equal(nextCalled, true);
    assert.equal(req.user?.userId, "u123");
    assert.equal(req.user?.role, "DOCTOR");
  });
});

describe("requireRole", () => {
  test("allows access when user role matches allowed roles", () => {
    const guard = requireRole("DOCTOR", "NURSE");
    let nextCalled = false;

    const req: any = { user: { userId: "doc1", role: "DOCTOR" } };
    const res: any = {
      status() { return this; },
      json() {},
    };
    const next = () => { nextCalled = true; };

    guard(req, res, next);
    assert.equal(nextCalled, true);
  });

  test("rejects access with 403 when user role is not authorized", () => {
    const guard = requireRole("DOCTOR");
    let statusCode = 0;
    let jsonBody: any = null;
    let nextCalled = false;

    const req: any = { user: { userId: "pat1", role: "PATIENT" } };
    const res: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(body: any) {
        jsonBody = body;
      },
    };
    const next = () => { nextCalled = true; };

    guard(req, res, next);
    assert.equal(statusCode, 403);
    assert.deepEqual(jsonBody, { message: "Insufficient permissions" });
    assert.equal(nextCalled, false);
  });
});
