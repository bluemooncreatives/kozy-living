"use client";

import { Disclosure, DisclosureButton, DisclosurePanel } from "@headlessui/react";
import { PlusIcon } from "@heroicons/react/24/outline";
import clsx from "clsx";

/**
 * Rule-separated FAQ accordion - the "Find answers to your questions" block
 * in the reference. Kept to hairlines and a rotating plus, no card chrome.
 */
export default function Accordion({
  items,
}: {
  items: readonly { question: string; answer: string }[];
}) {
  return (
    <div className="rule-t">
      {items.map((item) => (
        <Disclosure key={item.question} as="div" className="rule-b">
          {({ open }) => (
            <>
              <DisclosureButton className="flex w-full items-start justify-between gap-6 py-6 text-left">
                <span className="serif text-display-sm">
                  {item.question}
                </span>
                <PlusIcon
                  aria-hidden
                  className={clsx(
                    "mt-1 h-5 w-5 shrink-0 transition-transform duration-300 ease-editorial",
                    open && "rotate-45"
                  )}
                />
              </DisclosureButton>
              <DisclosurePanel className="body-mono max-w-measure pb-7">
                {item.answer}
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
      ))}
    </div>
  );
}
