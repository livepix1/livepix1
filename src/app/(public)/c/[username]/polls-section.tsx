"use client";

import { useEffect, useState } from "react";
import { voteInPoll } from "@/lib/actions/polls";

export interface PublicPollOption {
  id: string;
  label: string;
  voteCount: number;
}

export interface PublicPoll {
  id: string;
  question: string;
  options: PublicPollOption[];
}

const VOTED_KEY = "pixflow_voted_polls";

function readVotedIds(): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(VOTED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function saveVotedId(pollId: string, optionId: string) {
  try {
    const current = readVotedIds();
    current[pollId] = optionId;
    window.localStorage.setItem(VOTED_KEY, JSON.stringify(current));
  } catch {
    /* localStorage indisponível — segue sem persistir */
  }
}

function PollCard({ poll }: { poll: PublicPoll }) {
  const [options, setOptions] = useState(poll.options);
  const [votedOptionId, setVotedOptionId] = useState<string | null>(null);
  const [voting, setVoting] = useState(false);

  useEffect(() => {
    const voted = readVotedIds();
    if (voted[poll.id]) setVotedOptionId(voted[poll.id]);
  }, [poll.id]);

  const total = options.reduce((sum, o) => sum + o.voteCount, 0);

  async function handleVote(optionId: string) {
    if (voting || votedOptionId) return;
    setVoting(true);
    setOptions((prev) =>
      prev.map((o) => (o.id === optionId ? { ...o, voteCount: o.voteCount + 1 } : o))
    );
    setVotedOptionId(optionId);
    saveVotedId(poll.id, optionId);
    await voteInPoll(optionId);
    setVoting(false);
  }

  return (
    <div>
      <p className="mb-3 text-sm text-pixflow-slate">{poll.question}</p>
      <div className="grid gap-2">
        {options.map((o) => {
          const pct = total > 0 ? Math.round((o.voteCount / total) * 100) : 0;
          const isChoice = votedOptionId === o.id;
          if (votedOptionId) {
            return (
              <div key={o.id}>
                <div className="mb-1 flex justify-between text-xs">
                  <span className={isChoice ? "text-pixflow-cyan" : "text-white/60"}>
                    {o.label}
                    {isChoice ? " ✓" : ""}
                  </span>
                  <span className="text-white/50">{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-pixflow-cyan to-pixflow-magenta"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          }
          return (
            <button
              key={o.id}
              type="button"
              disabled={voting}
              onClick={() => handleVote(o.id)}
              className="w-full rounded-xl border border-white/10 bg-pixflow-dark px-4 py-2.5 text-left text-sm text-pixflow-slate transition-colors hover:border-pixflow-cyan hover:bg-pixflow-cyan/10 disabled:opacity-50"
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {votedOptionId && (
        <p className="mt-2 text-right text-xs text-white/40">{total} votos no total</p>
      )}
    </div>
  );
}

export function PollsSection({ polls }: { polls: PublicPoll[] }) {
  if (polls.length === 0) return null;
  return (
    <div className="grid gap-6">
      {polls.map((p, i) => (
        <div key={p.id} className={i > 0 ? "border-t border-white/10 pt-6" : undefined}>
          <PollCard poll={p} />
        </div>
      ))}
    </div>
  );
}
