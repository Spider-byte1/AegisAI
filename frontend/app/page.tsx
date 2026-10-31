import CommandCenter from "@/components/soc/CommandCenter";
import { CopilotProvider } from "@/hooks/useCopilot";
import { SoundProvider } from "@/hooks/useSound";

export default function Home() {
  return (
    <SoundProvider>
      <CopilotProvider>
        <CommandCenter />
      </CopilotProvider>
    </SoundProvider>
  );
}
