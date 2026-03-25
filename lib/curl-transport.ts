import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const CURL_STATUS_MARKER = "__CURL_STATUS__";

type CurlRequestInput = {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
  timeoutSeconds?: number;
};

export function isCertificateChainError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const causeMessage =
    typeof error.cause === "object" &&
    error.cause &&
    "message" in error.cause &&
    typeof error.cause.message === "string"
      ? error.cause.message
      : "";

  return /certificate|self-signed/i.test(`${error.message} ${causeMessage}`);
}

export async function requestTextWithCurl({
  url,
  method = "GET",
  headers = {},
  body,
  timeoutSeconds = 20
}: CurlRequestInput) {
  const args = [
    "-sS",
    "-X",
    method,
    url,
    "--connect-timeout",
    String(timeoutSeconds),
    "--max-time",
    String(timeoutSeconds)
  ];

  Object.entries(headers).forEach(([key, value]) => {
    args.push("-H", `${key}: ${value}`);
  });

  if (body) {
    args.push("-d", body);
  }

  args.push("-w", `\n${CURL_STATUS_MARKER}:%{http_code}`);

  const { stdout, stderr } = await execFileAsync("curl", args, {
    maxBuffer: 2 * 1024 * 1024
  });

  const statusMatch = stdout.match(new RegExp(`\\n${CURL_STATUS_MARKER}:(\\d+)$`));

  if (!statusMatch) {
    throw new Error(stderr?.trim() || "curl 未返回 HTTP 状态码。");
  }

  return {
    status: Number(statusMatch[1]),
    text: stdout.replace(new RegExp(`\\n${CURL_STATUS_MARKER}:\\d+$`), "")
  };
}
