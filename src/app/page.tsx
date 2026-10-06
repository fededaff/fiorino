import { TreasuryConsole } from "./treasury-console";

export default function Home() {
  return (
    <main className="fiorino-shell relative flex-1 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.55),_transparent_55%),linear-gradient(160deg,#e8f2ef_0%,#f7f3e8_42%,#e7eef2_100%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%22160%22 viewBox=%220 0 160 160%22%3E%3Cpath fill=%22none%22 stroke=%22%231f4f48%22 stroke-opacity=%220.06%22 d=%22M0 80h160M80 0v160%22/%3E%3C/svg%3E')]" />
      <div className="relative z-10">
        <TreasuryConsole />
      </div>
    </main>
  );
}
