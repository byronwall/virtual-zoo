import type { APIEvent } from "@solidjs/start/server";
import {
  getZooPasscodeCookieValue,
  validateZooPasscodeInput,
  zooPasscodeCookie,
} from "~/lib/stuffed-zoo/passcode";

export async function POST(event: APIEvent) {
  if (!(await validateZooPasscodeInput(event.request))) {
    return Response.json({ error: "That passcode did not open the zoo." }, { status: 401 });
  }
  return Response.json(
    { ok: true, cookieValue: getZooPasscodeCookieValue() },
    {
      headers: {
        "set-cookie": zooPasscodeCookie(),
      },
    },
  );
}
