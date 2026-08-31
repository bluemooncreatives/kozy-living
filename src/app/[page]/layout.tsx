export const dynamic = "force-dynamic";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <div className="shell py-16 md:py-24">{children}</div>;
}
