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
  // 在 Edge Runtime 中使用 fetch 代替 curl
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutSeconds * 1000);

  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    const text = await response.text();
    clearTimeout(timeoutId);

    return {
      status: response.status,
      text
    };
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}
