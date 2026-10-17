/**
 * A script that runs while the HTML is parsed, before first paint. Used to apply saved
 * preferences without a flash (see Next.js "Preventing flash before hydration").
 * The type switch avoids React's dev warning about rendering <script> on the client.
 */
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
