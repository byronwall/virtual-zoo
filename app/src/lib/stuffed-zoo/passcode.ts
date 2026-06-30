import { createHash, timingSafeEqual } from "node:crypto";
import type { APIEvent } from "@solidjs/start/server";
import { loginSchema } from "./schema";

export const zooPasscodeCookieName = "stuffed_zoo_pass";
export const zooPasscodeMaxAgeSeconds = 60 * 60 * 24 * 365 * 20;

const getPasscode = () => process.env.STUFFED_ZOO_PASSCODE?.trim() || "violet";

const hashPasscode = (passcode: string) =>
  createHash("sha256").update(passcode).digest("base64url");

export const getZooPasscodeCookieValue = () => hashPasscode(getPasscode());

const parseCookieHeader = (header: string | null) =>
  Object.fromEntries(
    (header ?? "")
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );

export const hasValidZooPasscodeCookie = (request: Request) => {
  const value = parseCookieHeader(request.headers.get("cookie"))[zooPasscodeCookieName];
  return hasValidZooPasscodeToken(value);
};

export const hasValidZooPasscodeHeader = (request: Request) =>
  hasValidZooPasscodeToken(request.headers.get("x-stuffed-zoo-pass"));

const hasValidZooPasscodeToken = (value: string | null | undefined) => {
  if (!value) return false;
  const expected = getZooPasscodeCookieValue();
  const actualBuffer = Buffer.from(value);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
};

export const zooPasscodeCookie = () =>
  `${zooPasscodeCookieName}=${encodeURIComponent(getZooPasscodeCookieValue())}; Path=/; Max-Age=${zooPasscodeMaxAgeSeconds}; SameSite=Lax; HttpOnly`;

export const validateZooPasscodeInput = async (request: Request) => {
  const input = loginSchema.parse(await request.json().catch(() => ({})));
  return input.passcode === getPasscode();
};

export const requireZooPasscode = (event: APIEvent) => {
  if (hasValidZooPasscodeCookie(event.request) || hasValidZooPasscodeHeader(event.request)) return;
  throw new Response(JSON.stringify({ error: "Passcode required." }), {
    status: 401,
    headers: {
      "content-type": "application/json",
    },
  });
};
