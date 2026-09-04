import { Metadata } from "next";
import Breadcrumb from "@/components/ui/breadcrumb";
import ContactForm from "@/components/contact/contact-form";
import { Eyebrow, Headline } from "@/components/ui/section";
import { contact, site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact",
  description: `Questions about our handcrafted objects, custom dimensions, or styling your space - write to ${site.name} at ${contact.email}.`,
  openGraph: { type: "website" },
};

/**
 * Contact. Copy on the left, form in a white panel on the right; the two
 * studio addresses and the direct lines sit in a row of panels underneath.
 *
 * The form is the only client component on the page - the addresses are static
 * copy from `site.ts`, so they render on the server and stay in the HTML for
 * crawlers and for anyone whose JavaScript never arrives.
 */
export default function ContactPage() {
  return (
    <>
      <Breadcrumb current={contact.title} />

      <section
        aria-labelledby="contact"
        className="shell grid grid-cols-1 items-start gap-3 pb-10 lg:grid-cols-2"
      >
          <div className="py-4 lg:py-8">
            <Eyebrow align="left">{contact.eyebrow}</Eyebrow>
            <Headline as="h1" id="contact" className="mt-4">
              {contact.title}
            </Headline>
            <div className="mt-5 max-w-measure space-y-4">
              {contact.body.map((paragraph) => (
                <p key={paragraph} className="body-mono text-pretty">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>

          <div className="panel p-6 md:p-10">
            <ContactForm />
          </div>
      </section>

      <section aria-labelledby="find-us" className="shell pb-14">
        <h2 id="find-us" className="sr-only">
          Where to find us
        </h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {contact.locations.map((location) => (
            <li key={location.label} className="panel p-6 md:p-8">
              <p className="micro-mono text-muted">{location.label}</p>
              <address className="body-mono mt-4 not-italic">
                {location.lines.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </address>
            </li>
          ))}

          <li className="panel-yellow p-6 md:p-8">
            <p className="micro-mono text-muted">Direct</p>
            <div className="mt-4 flex flex-col items-start gap-3">
              <a href={`mailto:${contact.email}`} className="link-arrow">
                {contact.email}
              </a>
              {/* `tel:` needs the E.164 form; the visible string keeps the
                  spacing someone would read aloud. */}
              <a href={`tel:${contact.phoneHref}`} className="link-arrow">
                {contact.phone}
              </a>
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
