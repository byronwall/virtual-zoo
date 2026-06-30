import type { APIEvent } from "@solidjs/start/server";
import {
  hasValidZooPasscodeCookie,
  hasValidZooPasscodeHeader,
} from "~/lib/stuffed-zoo/passcode";

export function GET(event: APIEvent) {
  return Response.json({
    authenticated:
      hasValidZooPasscodeCookie(event.request) || hasValidZooPasscodeHeader(event.request),
  });
}
