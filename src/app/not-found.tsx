import Link from "next/link";
import { Eyebrow, Headline } from "@/components/ui/section";

export const metadata = {
  title: "Page not found",
};

export default function NotFound() {
  return (
    <div className="shell flex min-h-[60vh] flex-col justify-center py-24">
      <Eyebrow align="left">Error 404</Eyebrow>
      <Headline className="mt-6">
        We could not find that piece in the studio
      </Headline>
      <p className="body-mono mt-8 max-w-measure">
        The page you are looking for has been moved or does not exist. Our current
        sanctuary collection is waiting on the shelves.
      </p>
      <div className="mt-10 flex flex-wrap gap-4">
        <Link href="/search" className="btn-solid">
          Explore collection
        </Link>
        <Link href="/" className="btn-outline">
          Back home
        </Link>
      </div>
    </div>
  );
}
