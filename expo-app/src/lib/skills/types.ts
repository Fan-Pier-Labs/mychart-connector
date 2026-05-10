/**
 * A "skill" is a curated playbook the user can launch from the chat
 * empty state. Picking one starts a new chat: the kickoff message is
 * shown as the first user turn, and the skill's playbook is appended
 * to the chat's system prompt so the model knows how to execute it.
 *
 * Skills are intentionally a thin layer on top of the existing tool
 * loop — no new infra. The model still emits the same JSON tool calls;
 * the playbook just constrains *which* tools to call and in what order.
 */
export type Skill = {
  /** Stable id, used in analytics and as a React key. */
  id: string;
  /** Short user-facing title shown in the sheet. */
  title: string;
  /** One-line description shown under the title in the sheet. */
  description: string;
  /** Single character / emoji-ish icon to render in the chip. */
  icon: string;
  /**
   * What we send as the first user message when this skill is launched.
   * Surfaces in the chat history so the user can scroll back and see
   * exactly what was asked. The model treats this as the user's request.
   */
  kickoffMessage: string;
  /**
   * Appended to the chat's system prompt for the lifetime of the chat.
   * Should describe the skill's goal, the tools to use, the order to
   * use them in, and any safety framing.
   */
  playbook: string;
};
