import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { runControlCommand, replayLatestAlert } from "@/lib/actions/alerts";

const QUEUE_ACTIONS = new Set(["skip", "pause", "resume", "clear"]);

/** POST /api/v1/alerts/{skip|pause|resume|clear|replay} — escopo "alerts". */
export async function POST(req: Request, { params }: { params: { action: string } }) {
  const userId = await authenticateApiKey(req, "alerts");
  if (!userId) {
    return NextResponse.json({ error: "API key inválida ou sem escopo 'alerts'" }, { status: 401 });
  }

  if (params.action === "replay") {
    const result = await replayLatestAlert(userId);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  if (QUEUE_ACTIONS.has(params.action)) {
    const result = await runControlCommand(
      userId,
      params.action as "skip" | "pause" | "resume" | "clear"
    );
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
