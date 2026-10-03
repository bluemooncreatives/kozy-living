"use client";

import clsx from "clsx";
import Link from "next/link";
import { useId, useState } from "react";
import { ArrowUpRight } from "@/components/ui/arrow-badge";
import type { FaqItem, FaqTopic } from "@/lib/shop/faq";
import { faq } from "@/lib/site";

/**
 * The pills and the rows of the FAQ band (`faq-section.tsx` draws the rest).
 *
 * One answer open at a time, and the first one open on arrival and on every
 * topic change, so the board never lands as a wall of closed questions.
 *
 * The rows open on a `grid-template-rows: 0fr -> 1fr` transition rather than
 * a measured height: it animates to the content's real height, whatever the
 * font or the wrap, with nothing to re-measure on resize. A closed answer is
 * `inert` - still in the HTML for search engines and find-in-page, out of the
 * tab order and the accessibility tree.
 */

const pad = (value: number) => String(value).padStart(2, "0");

export function HomeFaqBoard({ items }: { items: FaqItem[] }) {
  const uid = useId();
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);

  return (
    <div className="faq-home-list">
      <div className="faq-home-list-head micro-mono">
        <span>Good to know</span>
        <span className="tabular-nums">{faq.count(items.length)}</span>
      </div>
      <ol className="faq-rows" data-reveal-group="">
        {items.map((item, index) => (
          <FaqRow
            key={item.id}
            item={item}
            index={index}
            uid={uid}
            open={openId === item.id}
            turned={false}
            onToggle={() =>
              setOpenId((current) => (current === item.id ? null : item.id))
            }
          />
        ))}
      </ol>
    </div>
  );
}

export default function FaqBoard({ topics }: { topics: FaqTopic[] }) {
  const uid = useId();
  const [topicKey, setTopicKey] = useState(topics[0]?.key ?? "");
  const [openId, setOpenId] = useState<string | null>(
    topics[0]?.items[0]?.id ?? null,
  );
  // False until the first pill is pressed. The first list rides the motion
  // layer's scroll reveal; every list after that is mounted by a click, after
  // its trigger would have fired, so it takes the CSS entrance instead (the
  // same split as the lookbook deck).
  const [turned, setTurned] = useState(false);

  const topic = topics.find((t) => t.key === topicKey) ?? topics[0];
  if (!topic) return null;

  const choose = (next: FaqTopic) => {
    if (next.key === topic.key) return;
    setTopicKey(next.key);
    setOpenId(next.items[0]?.id ?? null);
    setTurned(true);
  };

  // A product page has one category leading the shared topics, so its pills
  // form a single group. Keep the grouping logic for any future multi-group
  // board while the homepage uses the flat list above.
  const labelled =
    topics.filter((t) => t.group === "categories").length > 1;
  // In the order the data gives them: the homepage leads with the shared
  // topics, a product page with its own category.
  const groups = labelled
    ? [...new Set(topics.map((t) => t.group))].map((group) => ({
        group,
        topics: topics.filter((t) => t.group === group),
      }))
    : [{ group: "topics" as const, topics }];

  return (
    <>
      <div className="faq-topics" data-reveal="">
        {groups.map(({ group, topics: members }) => (
          <div key={group} className="faq-pill-group">
            {labelled ? (
              <p id={`${uid}-${group}`} className="micro-mono text-muted">
                {faq.groups[group]}
              </p>
            ) : null}
            <div
              role="group"
              aria-labelledby={labelled ? `${uid}-${group}` : undefined}
              aria-label={labelled ? undefined : faq.groups.topics}
              className="faq-pills"
            >
              {members.map((member) => {
                const active = member.key === topic.key;
                return (
                  <button
                    key={member.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => choose(member)}
                    className={clsx("faq-pill", active && "is-active")}
                  >
                    {member.label}
                    <span className="faq-pill-count tabular-nums" aria-hidden>
                      {pad(member.items.length)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="faq-list">
        {/* Announced on a topic change, so a screen reader hears where the
            pill took it without the whole list being read out. */}
        <div
          aria-live="polite"
          className="micro-mono flex items-baseline justify-between gap-4 border-b border-rule pb-3 text-muted"
        >
          <span>{topic.label}</span>
          <span className="tabular-nums">{faq.count(topic.items.length)}</span>
        </div>

        {topic.blurb ? (
          <p
            key={`${topic.key}-blurb`}
            className={clsx(
              "body-mono max-w-measure pt-5",
              turned && "faq-turn",
            )}
          >
            {topic.blurb}
          </p>
        ) : null}

        <ol
          key={topic.key}
          {...(turned ? {} : { "data-reveal-group": "" })}
          className="faq-rows"
        >
          {topic.items.map((item, index) => (
            <FaqRow
              key={item.id}
              item={item}
              index={index}
              uid={uid}
              open={openId === item.id}
              turned={turned}
              onToggle={() =>
                setOpenId((current) => (current === item.id ? null : item.id))
              }
            />
          ))}
        </ol>

        {topic.shop ? (
          <Link
            key={`${topic.key}-shop`}
            href={topic.shop.href}
            prefetch={false}
            className={clsx("link-arrow mt-6", turned && "faq-turn")}
          >
            {topic.shop.label} <ArrowUpRight />
          </Link>
        ) : null}
      </div>
    </>
  );
}

function FaqRow({
  item,
  index,
  uid,
  open,
  turned,
  onToggle,
}: {
  item: FaqItem;
  index: number;
  uid: string;
  open: boolean;
  turned: boolean;
  onToggle: () => void;
}) {
  const buttonId = `${uid}-${item.id}-q`;
  const panelId = `${uid}-${item.id}-a`;
  const external = item.link && /^https?:/.test(item.link.href);

  return (
    <li
      className={clsx("faq-row", open && "is-open", turned && "faq-turn")}
      style={turned ? ({ "--i": index } as React.CSSProperties) : undefined}
    >
      <h3>
        <button
          id={buttonId}
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="faq-q"
        >
          <span aria-hidden className="faq-num display-face tabular-nums">
            {pad(index + 1)}
          </span>
          <span className="faq-question serif">{item.question}</span>
          <span aria-hidden className="faq-toggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <span className="sr-only">{open ? faq.close : faq.open}</span>
        </button>
      </h3>

      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        inert={!open}
        className="faq-a"
      >
        <div className="faq-a-inner">
          <div className="faq-a-body">
            <p className="body-mono max-w-measure">{item.answer}</p>

            {item.tags?.map((tag) => (
              <div key={tag.label ?? "values"} className="mt-4">
                {tag.label ? (
                  <p className="micro-mono mb-2 text-muted">{tag.label}</p>
                ) : null}
                <ul className="flex flex-wrap gap-2">
                  {tag.values.map((value) => (
                    <li key={value} className="faq-tag">
                      {value}
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {item.link ? (
              external ? (
                <a
                  href={item.link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-arrow mt-5"
                >
                  {item.link.label} <ArrowUpRight />
                </a>
              ) : (
                <Link
                  href={item.link.href}
                  prefetch={false}
                  className="link-arrow mt-5"
                >
                  {item.link.label} <ArrowUpRight />
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
