import Price from "@/components/price";
import { Eyebrow, Headline } from "@/components/ui/section";
import {
  fetchCustomerAccount,
  getCustomerSession,
} from "@/lib/customer-account";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "My account",
  description: "View your profile, addresses, and order history.",
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const session = await getCustomerSession();

  if (!session.isAuthenticated) {
    return (
      <div className="shell flex min-h-[60vh] items-center py-20">
        <div className="mx-auto w-full max-w-lg rounded-plate border border-rule p-10 text-center">
          <Eyebrow>Account</Eyebrow>
          <Headline as="h1" size="md" className="mt-4">
            Sign in to your account
          </Headline>
          <p className="body-mono mt-5">
            Sign in securely with Shopify to see your profile, saved addresses
            and order history. New customers can create an account on the same
            screen.
          </p>
          {error ? (
            <p role="alert" className="spec-mono mt-5 uppercase">
              We couldn&apos;t complete sign-in. Please try again.
            </p>
          ) : null}
          <Link
            href="/api/auth/login?returnTo=/account"
            className="btn-solid mt-8"
          >
            Sign in <span aria-hidden>&rarr;</span>
          </Link>
        </div>
      </div>
    );
  }

  if (session.isExpired) redirect("/api/auth/refresh?returnTo=/account");
  const customer = await fetchCustomerAccount(session.accessToken!);
  if (!customer) redirect("/api/auth/refresh?returnTo=/account");

  return (
    <div className="shell py-12 md:py-16">
      <div className="rule-b flex flex-wrap items-end justify-between gap-6 pb-8">
        <div>
          <Eyebrow align="left">Welcome back</Eyebrow>
          <Headline as="h1" className="mt-3">
            {customer.displayName}
          </Headline>
          <p className="body-mono mt-2">
            {customer.emailAddress?.emailAddress}
          </p>
        </div>
        <Link href="/api/auth/logout" className="btn-outline">
          Sign out
        </Link>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:gap-10">
        <section className="lg:col-span-4">
          <Eyebrow align="left">Profile</Eyebrow>
          <dl className="rule-t mt-5 pt-5">
            {[
              { term: "Name", value: customer.displayName },
              {
                term: "Email",
                value: customer.emailAddress?.emailAddress || "Not provided",
              },
              {
                term: "Phone",
                value: customer.phoneNumber?.phoneNumber || "Not provided",
              },
            ].map((row) => (
              <div
                key={row.term}
                className="rule-b grid grid-cols-3 items-baseline gap-4 py-3"
              >
                <dt className="spec-mono uppercase">{row.term}</dt>
                <dd className="spec-mono col-span-2">{row.value}</dd>
              </div>
            ))}
          </dl>

          <Eyebrow align="left" className="mt-10">
            Saved addresses
          </Eyebrow>
          {customer.addresses.nodes.length ? (
            <ul className="rule-t mt-5">
              {customer.addresses.nodes.map((address) => (
                <li key={address.id} className="rule-b body-mono py-4">
                  {address.formatted.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          ) : (
            <p className="body-mono rule-t mt-5 pt-5">
              No saved addresses yet.
            </p>
          )}
        </section>

        <section className="lg:col-span-7 lg:col-start-6">
          <Eyebrow align="left">Order history</Eyebrow>
          {customer.orders.nodes.length ? (
            <ul className="rule-t mt-5">
              {customer.orders.nodes.map((order) => (
                <li
                  key={order.id}
                  className="rule-b flex flex-wrap items-start justify-between gap-6 py-5"
                >
                  <div>
                    <p className="ui-mono normal-case">{order.name}</p>
                    <p className="spec-mono mt-1.5">
                      {new Intl.DateTimeFormat("en", {
                        dateStyle: "medium",
                      }).format(new Date(order.processedAt))}
                    </p>
                    <p className="micro-mono mt-2">
                      {[order.financialStatus, order.fulfillmentStatus]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <Price
                      className="serif text-display-sm"
                      amount={order.totalPrice.amount}
                      currencyCode={order.totalPrice.currencyCode}
                    />
                    {order.statusPageUrl ? (
                      <a
                        href={order.statusPageUrl}
                        className="link-arrow mt-3"
                      >
                        View order <span aria-hidden>&rarr;</span>
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5 rounded-plate border border-rule px-8 py-16 text-center">
              <p className="serif text-display-md">No orders yet</p>
              <p className="body-mono mt-3">
                Your first bag from the estate is waiting.
              </p>
              <Link href="/search" className="btn-outline mt-8">
                Start shopping <span aria-hidden>&rarr;</span>
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
