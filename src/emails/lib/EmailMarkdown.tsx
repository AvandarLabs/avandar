import { Markdown } from "@react-email/components";

export function EmailMarkdown({ children }: { children: string }): JSX.Element {
  return (
    <Markdown
      markdownContainerStyles={styles.container}
      markdownCustomStyles={styles.customStyles}
    >
      {children}
    </Markdown>
  );
}

const styles = {
  container: {
    color: "#394e6a",
    padding: "0px 1rem",
  },
  customStyles: {
    h1: {
      fontSize: "1.5rem",
      fontWeight: "bold",
      letterSpacing: "0.025em",
      marginBottom: "1rem",
    },
    h2: {
      fontSize: "1.25rem",
      fontWeight: "bold",
      letterSpacing: "0.025em",
      marginBottom: "0.5rem",
    },
    h3: {
      fontSize: "1.125rem",
      fontWeight: "bold",
      letterSpacing: "0.025em",
      marginBottom: "0.5rem",
    },
    p: {
      lineHeight: "1.5",
    },
    codeBlock: {
      backgroundColor: "#0f172a",
      borderRadius: "8px",
      color: "#e2e8f0",
      lineHeight: "1.5",
      padding: "1rem 0.25rem 0.75rem 1rem",
    },
    codeInline: {
      backgroundColor: "#f1f5f9", // slate-100
      borderRadius: "6px",
      color: "#334155", // slate-700
      fontFamily:
        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
      fontSize: "0.9em",
      padding: "0.2em 0.4em",
    },
    blockQuote: {
      backgroundColor: "#f5f9ff",
      borderBottomRightRadius: "8px",
      borderLeft: "6px solid #e2e7ef",
      borderTopRightRadius: "8px",
      marginBlockEnd: "1rem",
      marginBlockStart: "1rem",
      marginLeft: "0px",
      marginInlineEnd: "0px",
      padding: "0.25rem 1rem 0.25rem 1rem",
    },
    li: {
      lineHeight: "1.5rem",
    },
  },
};
