import { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import ContactForm from "@/components/contact/contact-form";
import { Eyebrow, Headline } from "@/components/ui/section";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions about the beans, an order, or which roast to try next - write to ${site.name} at ${contact.email}.`,
  openGraph: { type: "website" },
};

/**
 * Contact. Copy on the left, form on the right, split by the same hairline
 * that divides every other pair of cells in the system; the two addresses and
 * the direct lines sit in a ruled band underneath.
 *
 * The form is the only client component on the page - the addresses are static
 * copy from `site.ts`, so they render on the server and stay in the HTML for
 * crawlers and for anyone whose JavaScript never arrives.
 */
export default function ContactPage() {
  return (
    <>
      <Breadcrumb current={contact.title} />

      <section aria-labelledby="contact" className="rule-b">
        <div className="grid grid-cols-1 lg:grid-cols-2">
          <div className="flex flex-col items-center px-[var(--gutter)] py-12 text-center md:py-16 lg:px-10">
            <Eyebrow>{contact.eyebrow}</Eyebrow>
            <Headline as="h1" id="contact" className="mt-5">
              {contact.title}
            </Headline>
            <div className="mt-6 max-w-measure space-y-5">
              {contact.body.map((paragraph) => (
                <p key={paragraph} className="body-mono text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          {/* The divider is horizontal while the columns are stacked and
              vertical once they sit side by side - it always separates them
              along the axis they actually meet on. */}
          <div className="border-t border-rule px-[var(--gutter)] py-12 md:py-16 lg:border-l lg:border-t-0 lg:px-10">
            <ContactForm />
          </div>
        </div>
      </section>

      <section aria-labelledby="find-us" className="rule-b">
        <h2 id="find-us" className="sr-only">
          Where to find us
        </h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {contact.locations.map((location) => (
            <li
              key={location.label}
              className="border-b border-rule p-6 md:p-10 sm:border-r sm:last:border-r-0 lg:border-b-0"
            >
              <p className="micro-mono text-oxblood">{location.label}</p>
              <address className="body-mono mt-4 not-italic">
                {location.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </li>
          ))}

          <li className="p-6 md:p-10">
            <p className="micro-mono text-oxblood">Direct</p>
            <div className="mt-4 flex flex-col items-start gap-3">
              <a href={`mailto:${contact.email}`} className="link-arrow normal-case">
                {contact.email}
              </a>
              {/* `tel:` needs the E.164 form; the visible string keeps the
                  spacing someone would read aloud. */}
              <a href={`tel:${contact.phoneHref}`} className="link-arrow normal-case">
                {contact.phone}
              </a>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
