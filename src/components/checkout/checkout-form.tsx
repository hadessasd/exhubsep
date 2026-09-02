import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Copy,
  Check,
  ExternalLink,
  Gift,
  QrCode,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { Product } from "@/lib/data/catalog";
import {
  CRYPTO_ASSETS,
  CRYPTO_BUY_LINKS,
  CONTACT_METHODS,
  GIFT_CARD_CHECKOUT_URL,
  type CryptoAssetId,
} from "@/lib/data/catalog";
import { formatUsd } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { createOrder } from "@/lib/server/examhub";
import { toast } from "sonner";

const CART_KEY = "examhub.checkout_history";
const LAST_KEY = "examhub.last_checkout";

type PayTab = "crypto" | "gift";

type Prices = Partial<Record<CryptoAssetId, number>>;

function rememberCheckout(product: Product) {
  try {
    const entry = {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      priceUsd: product.priceUsd,
      at: Date.now(),
    };
    const prev = JSON.parse(localStorage.getItem(CART_KEY) || "[]") as unknown[];
    const next = [
      entry,
      ...prev.filter((x: any) => x?.productId !== product.id),
    ].slice(0, 40);
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    localStorage.setItem(LAST_KEY, JSON.stringify(entry));
  } catch {
    /* storage blocked */
  }
}

async function fetchUsdPrices(): Promise<Prices> {
  const ids = Object.values(CRYPTO_ASSETS)
    .map((a) => a.geckoId)
    .join(",");
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`,
  );
  if (!res.ok) throw new Error("price feed unavailable");
  const json = (await res.json()) as Record<string, { usd?: number }>;
  const out: Prices = {};
  for (const asset of Object.values(CRYPTO_ASSETS)) {
    const usd = json[asset.geckoId]?.usd;
    if (typeof usd === "number" && usd > 0) out[asset.id] = usd;
  }
  return out;
}

function amountFor(usd: number, priceUsd: number | undefined, decimals: number) {
  if (!priceUsd) return null;
  const raw = usd / priceUsd;
  return Number(raw.toFixed(decimals));
}

function qrSrc(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(payload)}`;
}

function paymentUri(asset: (typeof CRYPTO_ASSETS)[CryptoAssetId], amount: number | null) {
  if (asset.id === "sol") {
    return amount
      ? `solana:${asset.address}?amount=${amount}`
      : `solana:${asset.address}`;
  }
  if (asset.id === "eth") {
    if (amount) {
      const wei = BigInt(Math.round(amount * 1e18)).toString();
      return `ethereum:${asset.address}?value=${wei}`;
    }
    return `ethereum:${asset.address}`;
  }
  if (asset.id === "ltc") {
    return amount
      ? `litecoin:${asset.address}?amount=${amount}`
      : `litecoin:${asset.address}`;
  }
  // USDC on Ethereum — token transfer isn't a simple URI; encode the receive address
  return asset.address;
}

export function CheckoutForm({ product }: { product: Product }) {
  const { user } = useCurrentUserState();
  const navigate = useNavigate();
  const [tab, setTab] = useState<PayTab>("crypto");
  const [coin, setCoin] = useState<CryptoAssetId>("sol");
  const [prices, setPrices] = useState<Prices>({});
  const [priceAt, setPriceAt] = useState<number | null>(null);
  const [priceErr, setPriceErr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contactMethod, setContactMethod] = useState("discord");
  const [contactValue, setContactValue] = useState("");
  const [txId, setTxId] = useState("");
  const [giftKey, setGiftKey] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    rememberCheckout(product);
  }, [product.id, product.slug, product.name, product.priceUsd]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const next = await fetchUsdPrices();
        if (cancelled) return;
        setPrices(next);
        setPriceAt(Date.now());
        setPriceErr(Object.keys(next).length === 0);
      } catch {
        if (!cancelled) setPriceErr(true);
      }
    }
    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const asset = CRYPTO_ASSETS[coin];
  const liveAmount = useMemo(
    () => amountFor(product.priceUsd, prices[coin], asset.decimals),
    [product.priceUsd, prices, coin, asset.decimals],
  );
  const uri = paymentUri(asset, liveAmount);

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(asset.address);
      setCopied(true);
      toast.success("Address copied");
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Could not copy — select the address manually");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      toast.error("Sign in first so we can attach this order to your account");
      return;
    }
    if (!contactValue.trim()) {
      toast.error("Add a contact so we can reach you after payment");
      return;
    }
    if (tab === "crypto" && !txId.trim()) {
      toast.error("Paste the transaction hash or payment reference");
      return;
    }
    if (tab === "gift" && !giftKey.trim()) {
      toast.error("Paste the G2A voucher / key code");
      return;
    }
    setBusy(true);
    try {
      const result = await createOrder({
        data: {
          productId: product.id,
          paymentMethod: tab === "gift" ? "gift_card" : "crypto",
          giftCardKey: tab === "gift" ? giftKey.trim() : undefined,
          cryptoCurrency: tab === "crypto" ? coin : undefined,
          cryptoTxId: tab === "crypto" ? txId.trim() : undefined,
          cryptoRail: "onchain",
          contactMethod,
          contactValue: contactValue.trim(),
          notes: notes.trim() || undefined,
        },
      });
      toast.success("Order submitted — pending admin confirmation");
      await navigate({
        to: "/orders",
        search: { placed: result.id, tab: "orders" },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="min-w-0 max-w-full overflow-hidden">
      <CardHeader className="min-w-0 space-y-2 px-4 sm:px-6">
        <CardTitle className="flex flex-wrap items-center gap-2 text-xl sm:text-2xl">
          <Wallet className="h-5 w-5 text-primary" />
          Pay {formatUsd(product.priceUsd)}
        </CardTitle>
        <p className="text-sm text-fg-muted">
          Crypto on-chain or a G2A crypto voucher. After you submit, the order
          stays <strong>pending</strong> until admin confirms and completes it.
        </p>
      </CardHeader>
      <CardContent className="min-w-0 space-y-5 px-4 sm:px-6">
        <div className="flex gap-1 rounded-xl border border-border bg-bg-soft p-1">
          <button
            type="button"
            onClick={() => setTab("crypto")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === "crypto"
                ? "bg-primary text-primary-fg shadow"
                : "text-fg-muted hover:bg-surface"
            }`}
          >
            <Wallet className="h-4 w-4" />
            Crypto
          </button>
          <button
            type="button"
            onClick={() => setTab("gift")}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
              tab === "gift"
                ? "bg-primary text-primary-fg shadow"
                : "text-fg-muted hover:bg-surface"
            }`}
          >
            <Gift className="h-4 w-4" />
            Gift card
          </button>
        </div>

        {tab === "crypto" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.values(CRYPTO_ASSETS) as Array<(typeof CRYPTO_ASSETS)[CryptoAssetId]>).map(
                (a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setCoin(a.id)}
                    className={`rounded-xl border px-2 py-2.5 text-left text-sm transition ${
                      coin === a.id
                        ? "border-primary bg-primary-soft text-fg"
                        : "border-border bg-surface text-fg-muted hover:border-primary/40"
                    }`}
                  >
                    <span className="block font-semibold">{a.symbol}</span>
                    <span className="block text-[11px] opacity-80">{a.network}</span>
                  </button>
                ),
              )}
            </div>

            <div className="rounded-2xl border border-border bg-bg-soft/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Send exactly
              </p>
              <p className="mt-1 font-display text-2xl font-bold text-fg">
                {liveAmount != null
                  ? `${liveAmount} ${asset.symbol}`
                  : `${formatUsd(product.priceUsd)} in ${asset.symbol}`}
              </p>
              <p className="text-xs text-fg-muted">
                Product {formatUsd(product.priceUsd)}
                {prices[coin]
                  ? ` · 1 ${asset.symbol} ≈ $${prices[coin]!.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  : " · live rate loading…"}
                {priceAt
                  ? ` · updated ${new Date(priceAt).toLocaleTimeString()}`
                  : ""}
              </p>
              {priceErr ? (
                <p className="mt-1 text-xs text-danger">
                  Live feed paused — send the USD equivalent in {asset.symbol}.
                </p>
              ) : null}

              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <div className="shrink-0 rounded-xl border border-border bg-white p-2">
                  <img
                    src={qrSrc(uri)}
                    alt={`${asset.symbol} payment QR`}
                    width={160}
                    height={160}
                    className="h-40 w-40"
                  />
                  <p className="mt-1 flex items-center justify-center gap-1 text-[10px] text-muted">
                    <QrCode className="h-3 w-3" />
                    Scan in wallet
                  </p>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <Label className="text-xs">
                    {asset.label} address ({asset.network})
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={asset.address}
                      className="font-mono text-xs"
                    />
                    <Button type="button" variant="outline" onClick={copyAddress}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  {asset.id === "usdc" ? (
                    <p className="text-xs text-fg-muted">
                      Send <strong>USDC on Ethereum</strong> only — not Solana or
                      other chains.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Don&apos;t have crypto?
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Buy with a card. These ramps require KYC, then withdraw to the
                address above.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {CRYPTO_BUY_LINKS.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg border border-border bg-bg-soft px-2.5 py-1.5 text-xs font-semibold text-fg hover:border-primary"
                    title={link.note}
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 rounded-2xl border border-border bg-bg-soft/60 p-4">
            <p className="text-sm text-fg-muted">
              Open G2A, pick a <strong>Crypto Voucher</strong> key that covers{" "}
              <strong>{formatUsd(product.priceUsd)}</strong>, pay there, then
              paste the code below. Only admin can see the code.
            </p>
            <a
              href={GIFT_CARD_CHECKOUT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-fg hover:opacity-90"
            >
              Buy voucher on G2A
              <ExternalLink className="h-4 w-4" />
            </a>
            <p className="text-[11px] text-muted">
              Use a denomination at or above the product price so the order
              clears.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Contact method</Label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm"
              >
                {CONTACT_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Your {contactMethod}</Label>
              <Input
                value={contactValue}
                onChange={(e) => setContactValue(e.target.value)}
                placeholder={
                  contactMethod === "email"
                    ? "you@email.com"
                    : contactMethod === "discord"
                      ? "username"
                      : "@handle or number"
                }
                required
              />
            </div>
          </div>

          {tab === "crypto" ? (
            <div className="space-y-1.5">
              <Label>Transaction hash / reference</Label>
              <Input
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                placeholder="Paste TX id after you send"
                required
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>G2A key / voucher code</Label>
              <Input
                value={giftKey}
                onChange={(e) => setGiftKey(e.target.value)}
                placeholder="XXXX-XXXX-XXXX"
                required
                autoComplete="off"
              />
              <p className="text-[11px] text-muted">
                Hidden from your order page — only admin reads this in the
                dashboard.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Anything we should know"
              rows={2}
            />
          </div>

          {!user ? (
            <p className="rounded-xl border border-border bg-bg-soft px-3 py-2 text-sm text-fg-muted">
              <Link to="/login" className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{" "}
              to submit — we attach the pending order to your account.
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={busy || !user}>
            {busy ? "Submitting…" : "Submit pending order"}
          </Button>
          <p className="flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Admin confirms payment, then marks the order complete. You&apos;ll
            see status on My dashboard.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
