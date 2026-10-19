import { questions } from "../data";
import type { AnswerHighlight } from "../utils";

function friendsLabel({ count, total }: AnswerHighlight): string {
  if (total === 1) return "1 friend thinks so";
  if (count === total) return `All ${total} friends think so`;
  return `${count} of ${total} friends think so`;
}

/** The answers friends actually picked, quoted, for the most telling questions. */
export function FriendQuotes({
  highlights,
  isSelf,
}: {
  highlights: AnswerHighlight[];
  isSelf: boolean;
}) {
  if (highlights.length === 0) return null;

  return (
    <div className="friend-quotes">
      <div className="section-label">💬 In their friends' words</div>
      {highlights.map((h) => {
        const q = questions[h.questionIndex];
        const differs =
          h.selfAnswerIndex !== null && h.selfAnswerIndex !== h.answerIndex;
        return (
          <figure className="friend-quote" key={h.questionIndex}>
            <figcaption className="quote-question">{q.question}</figcaption>
            <blockquote>“{q.answers[h.answerIndex]}”</blockquote>
            <div className="quote-meta">{friendsLabel(h)}</div>
            {differs && (
              <div className="quote-self">
                {isSelf ? "You" : "They"} said: “{q.answers[h.selfAnswerIndex!]}”
              </div>
            )}
          </figure>
        );
      })}
    </div>
  );
}
