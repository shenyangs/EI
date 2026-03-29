import { ConnectionLights } from "@/components/connection-lights";
import { getAiRuntimeConfig } from "@/lib/ai-runtime";

export function ConnectionLightsServer() {
  const runtime = getAiRuntimeConfig();

  return (
    <ConnectionLights
      initialPending
      initialModelConnected={false}
      initialWebSearchConnected={false}
      initialModelInfo={{ provider: runtime.provider, model: runtime.model }}
    />
  );
}
