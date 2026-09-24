import { PublicChrome } from "@/components/public/PublicChrome";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="site-stage">
      <PublicChrome>{children}</PublicChrome>
    </div>
  );
}
