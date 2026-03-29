import { ConnectionLights } from "@/components/connection-lights";
import { getAiStatusPayload } from "@/lib/ai-status";

export async function ConnectionLightsServer() {
  const status = await getAiStatusPayload();

  return (
    <ConnectionLights
      initialModelConnected={status.canGeneratePaperDraft}
      initialWebSearchConnected={status.canUseWebSearch}
      initialModelInfo={{ provider: status.provider, model: status.model }}
    />
  );
}
