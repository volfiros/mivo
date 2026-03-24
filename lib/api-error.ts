import { NextResponse } from "next/server";
import { ZodError } from "zod";

type DbLikeError = Error & { code?: string };

const unavailableCodes = new Set(["ECONNREFUSED", "ENOTFOUND", "ETIMEDOUT", "ECONNRESET", "57P01", "57P03"]);
const schemaCodes = new Set(["42P01", "42703", "42883", "42P07"]);

function getErrorMessage(error: Error) {
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Invalid request";
  }

  return error.message;
}

function getDatabaseStatus(error: DbLikeError) {
  if (error.message.includes("DATABASE_URL is missing")) {
    return {
      status: 503,
      error: "DATABASE_URL is missing. Add a valid Postgres connection string before starting the app."
    };
  }

  if (unavailableCodes.has(error.code ?? "") || error.message.includes("connect ECONNREFUSED")) {
    return {
      status: 503,
      error: "Database is unavailable. Start Postgres or update DATABASE_URL, then try again."
    };
  }

  if (schemaCodes.has(error.code ?? "")) {
    return {
      status: 500,
      error: "Database schema is out of date. Restart the app after refreshing your local Postgres schema."
    };
  }

  return null;
}

export function createRouteErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }

  if (error instanceof Error) {
    const databaseStatus = getDatabaseStatus(error as DbLikeError);

    if (databaseStatus) {
      return NextResponse.json(databaseStatus, { status: databaseStatus.status });
    }

    console.error(error);
    return NextResponse.json({ error: error.message || fallbackMessage }, { status: 500 });
  }

  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
