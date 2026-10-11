import { cookies, headers } from "next/headers";

/**
 * Is this request from a phone-width screen?
 *
 * Page sizes differ by device - a grid of one card per row needs far fewer of
 * them per page - and the page is cut on the SERVER, so the answer has to
 * exist before anything renders. In order of trust:
 *
 *   ?mobile=1 / ?mobile=0   a manual override, for checking either layout
 *   kozy_is_mobile cookie   the real viewport, written by the bootstrap
 *                           script in `layout.tsx` (< 768px), which reloads a
 *                           first visit whose width disagrees with its UA
 *   the user agent          a first visit, before the cookie exists
 *
 * One rule for every paginated grid - the shop, shop by colour and shop by
 * mood - so the same screen always gets the same page size.
 */
export async function isMobileRequest(
  params: Map<string, string>,
): Promise<boolean> {
  const override = params.get("mobile");
  if (override === "1") return true;
  if (override === "0") return false;

  const [headerList, cookieStore] = await Promise.all([headers(), cookies()]);

  const cookie = cookieStore.get("kozy_is_mobile")?.value;
  if (cookie !== undefined) return cookie === "1";

  return (
    headerList.get("sec-ch-ua-mobile") === "?1" ||
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(
      headerList.get("user-agent") || "",
    )
  );
}
