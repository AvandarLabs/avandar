const PICKED_ANSWER_REGEX =
  /^\[Clarification answer: (?!\(none of the listed options\)\]$)(?!\(custom answer: )(?!\(user let AI decide\)\]$).+\]$/s;

const PICKED_ANSWER_NOTE =
  "(The user picked this from the options you offered. When those options were a column's stored values, these are its values exactly as stored: filter on them as written and do not look them up again.)";

/**
 * Adds a note to each clarification answer the user picked from offered
 * options, in the copy of the thread sent to the model.
 *
 * The model never sees a discovery lookup's results, which stay in the
 * browser, so a bare `[Clarification answer: Brazil, India, Mexico]` gave it no
 * sign that these were checked against the column, and its rule to look up an
 * unknown filter value fired again on every answer. Consent checks and the
 * clarification count read the thread as the client sent it, not this copy.
 */
export function annotateClarificationAnswersForModel<
  Message extends { role: string; content: string },
>(messages: readonly Message[]): Message[] {
  return messages.map((message) => {
    return message.role === "user" && PICKED_ANSWER_REGEX.test(message.content)
      ? { ...message, content: `${message.content}\n${PICKED_ANSWER_NOTE}` }
      : message;
  });
}
