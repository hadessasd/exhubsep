import { useCallback, useEffect, useRef, useState } from "react";
import {
  MessageCircle,
  X,
  Send,
  Headphones,
  ExternalLink,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  startChatThread,
  sendChatMessage,
  listChatMessages,
  listMyChatThreads,
} from "@/lib/server/examhub";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const DISCORD_USER = "minjunio";

type Msg = {
  id: string;
  thread_id: string;
  sender: string;
  body: string;
  created_at: string;
};

export function ChatWidget() {
  const { user } = useCurrentUserState();
  const [open, setOpen] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [name, setName] = useState("");
  const [contactMethod, setContactMethod] = useState("discord");
  const [contactValue, setContactValue] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  /** Show full “Support chat” label briefly, then icon-only */
  const [showLabel, setShowLabel] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setShowLabel(false), 1200);
    return () => window.clearTimeout(id);
  }, []);

  const refreshMessages = useCallback(async (tid: string) => {
    try {
      const rows = await listChatMessages({ data: { threadId: tid } });
      setMessages(rows as Msg[]);
    } catch {
      /* ignore poll errors */
    }
  }, []);

  useEffect(() => {
    if (!user || threadId) return;
    void (async () => {
      try {
        const threads = await listMyChatThreads();
        const openThread = threads.find((t) => t.status === "open") ?? threads[0];
        if (openThread) {
          setThreadId(openThread.id);
          await refreshMessages(openThread.id);
        }
      } catch {
        /* empty */
      }
    })();
  }, [user, threadId, refreshMessages]);

  useEffect(() => {
    if (!open || !threadId) return;
    const id = window.setInterval(() => void refreshMessages(threadId), 4000);
    return () => window.clearInterval(id);
  }, [open, threadId, refreshMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  async function startThread() {
    if (!name.trim() || !contactValue.trim()) {
      toast.error("Name and contact are required");
      return;
    }
    setBusy(true);
    try {
      const res = await startChatThread({
        data: {
          visitorName: name.trim(),
          contactMethod,
          contactValue: contactValue.trim(),
          firstMessage: draft.trim() || "Hi — I need help with ExamHub.",
        },
      });
      setThreadId(res.threadId);
      setDraft("");
      await refreshMessages(res.threadId);
      toast.success("Chat started · admin is notified");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start chat");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!threadId || !draft.trim()) return;
    setBusy(true);
    try {
      await sendChatMessage({
        data: { threadId, body: draft.trim() },
      });
      setDraft("");
      await refreshMessages(threadId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setShowLabel(true)}
        onMouseLeave={() => {
          if (!open) {
            window.setTimeout(() => setShowLabel(false), 400);
          }
        }}
        className={cn(
          "fixed bottom-5 right-5 z-50 flex h-14 items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-fg shadow-lg shadow-primary/30 transition-all duration-300 hover:bg-primary-hover sm:bottom-6 sm:right-6",
          open ? "w-14 scale-95 px-0" : showLabel ? "px-4" : "w-14 px-0",
        )}
        aria-label="Support chat"
      >
        {open ? (
          <X className="h-5 w-5 shrink-0" />
        ) : (
          <>
            <MessageCircle className="h-5 w-5 shrink-0" />
            <span
              className={cn(
                "overflow-hidden whitespace-nowrap transition-all duration-300",
                showLabel ? "max-w-[8rem] opacity-100" : "max-w-0 opacity-0",
              )}
            >
              Support chat
            </span>
          </>
        )}
      </button>

      {open ? (
        <div className="fixed bottom-20 right-4 z-50 flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl sm:bottom-24 sm:right-6">
          <div className="flex items-start justify-between gap-2 bg-gradient-to-r from-primary to-accent px-4 py-3 text-primary-fg">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold">
                <Headphones className="h-4 w-4" />
                Support chat
              </div>
              <p className="mt-0.5 text-[11px] text-white/85">
                Active 24/7 · replies saved · Discord{" "}
                <span className="font-semibold">@{DISCORD_USER}</span>
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg p-1 hover:bg-white/15"
              onClick={() => setOpen(false)}
              aria-label="Minimize chat"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[50vh] flex-1 space-y-2 overflow-y-auto bg-bg-soft/50 p-3">
            {!threadId ? (
              <div className="space-y-3 rounded-xl border border-border bg-surface p-3">
                <p className="text-xs text-fg-muted">
                  Start a live support chat with admin. Messages are saved.
                  Prefer Discord? Message{" "}
                  <strong>@{DISCORD_USER}</strong>.
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Your name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Name"
                    className="h-9"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Contact via</Label>
                    <select
                      value={contactMethod}
                      onChange={(e) => setContactMethod(e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-border bg-surface px-2 text-sm"
                    >
                      <option value="discord">Discord</option>
                      <option value="email">Email</option>
                      <option value="instagram">Instagram</option>
                      <option value="telegram">Telegram</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Handle / email</Label>
                    <Input
                      value={contactValue}
                      onChange={(e) => setContactValue(e.target.value)}
                      placeholder="@user"
                      className="h-9"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">First message</Label>
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="What do you need help with?"
                    className="min-h-[72px] text-sm"
                  />
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  disabled={busy}
                  onClick={() => void startThread()}
                >
                  Start support chat
                </Button>
                <a
                  href={`https://discord.com/users/${DISCORD_USER}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Open Discord · @{DISCORD_USER}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <>
                {messages.length === 0 ? (
                  <p className="py-8 text-center text-xs text-muted">
                    No messages yet
                  </p>
                ) : (
                  messages.map((m) => {
                    const mine = m.sender === "user" || m.sender === "visitor";
                    const admin = m.sender === "admin";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                          mine
                            ? "ml-auto rounded-br-md bg-primary text-primary-fg"
                            : admin
                              ? "rounded-bl-md bg-surface text-fg shadow-sm ring-1 ring-border"
                              : "rounded-bl-md bg-bg-soft text-fg-muted",
                        )}
                      >
                        {!mine ? (
                          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-70">
                            {admin ? "Admin" : "System"}
                          </p>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">
                          {m.body}
                        </p>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </>
            )}
          </div>

          {threadId ? (
            <div className="flex gap-2 border-t border-border bg-surface p-2.5">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Type a message…"
                className="h-10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <Button
                size="icon"
                className="h-10 w-10 shrink-0"
                disabled={busy || !draft.trim()}
                onClick={() => void send()}
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
