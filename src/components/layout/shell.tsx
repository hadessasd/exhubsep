import { DoodleBackground } from "./doodle-background";
import { SiteHeader } from "./site-header";
import { SiteFooter } from "./site-footer";
import { ChatWidget } from "@/components/support/chat-widget";
import { SingleOrderPopup } from "@/components/home/order-popup";

export function Shell({
  children,
  isAdmin = false,
}: {
  children: React.ReactNode;
  isAdmin?: boolean;
}) {
  return (
    <div className="relative min-h-dvh w-full max-w-[100vw] overflow-x-hidden">
      <DoodleBackground />
      <div className="relative z-10 flex min-h-dvh w-full max-w-[100vw] flex-col overflow-x-hidden">
        <SiteHeader isAdmin={isAdmin} />
        <main className="w-full min-w-0 flex-1">{children}</main>
        <SiteFooter />
      </div>
      <SingleOrderPopup />
      <ChatWidget />
    </div>
  );
}
