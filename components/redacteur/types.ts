export interface RedacteurClient {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  type?: "particulier" | "professionnel";
  meta?: string;
}

export type MessageRole = "user" | "assistant" | "system_flash";

export interface ChoiceButton {
  label: string;
  action: string;
  payload?: unknown;
}

export interface QuickChoice {
  label: string;
  value: string;
}

export type MessageEmbed =
  | { type: "choice_buttons"; choices: ChoiceButton[] }
  | { type: "client_selector" }
  | { type: "client_full_list" }
  | { type: "new_client_form" }
  | { type: "send_actions"; email: string }
  | { type: "quick_choices"; question?: string; choices: QuickChoice[] }
  | {
      type: "redirect";
      destination: string;
      label: string;
      reason: string;
      href: string;
    };

export interface Message {
  id: string;
  role: MessageRole;
  content?: string;
  embed?: MessageEmbed;
}

export interface QuoteLine {
  id: string;
  label: string;
  price: number;
}

export type QuoteStatus = "draft" | "validated" | "sent";

export interface QuoteDraft {
  number: string;
  client: RedacteurClient;
  date: string;
  validity: number;
  tva: number;
  lines: QuoteLine[];
  status: QuoteStatus;
}

export type AgentAction =
  | { type: "start_quote" }
  | { type: "start_new_client" }
  | { type: "select_client"; client: RedacteurClient }
  | { type: "show_more_clients" }
  | { type: "create_new_client" }
  | { type: "describe_chantier"; description: string }
  | { type: "send_quote_now" }
  | { type: "cancel_send" }
  | { type: "quick_choice"; value: string }
  | { type: "send_text"; text: string };
