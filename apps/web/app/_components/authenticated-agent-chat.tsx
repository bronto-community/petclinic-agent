import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { AgentChat } from "./agent-chat";
import { AccountControl } from "./web-chat-auth";

export async function AuthenticatedAgentChat({
  sessionId,
  sessionless,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  if (process.env.NODE_ENV === "development") {
    return <AgentChat plan="premium" sessionId={sessionId} sessionless={sessionless} />;
  }

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return <AgentChat plan="free" sessionId={sessionId} sessionless={sessionless} />;

  return (
    <>
      <AgentChat
        plan="premium"
        sessionId={sessionId}
        sessionless={sessionless}
        user={{
          email: session.user.email,
          id: session.user.id,
          image: session.user.image,
          name: session.user.name,
        }}
      />
      <AccountControl
        email={session.user.email}
        image={session.user.image}
        name={session.user.name}
      />
    </>
  );
}
