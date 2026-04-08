export type AuthenticatedUserSummary = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  hasOpenAiKey: boolean;
  maskedOpenAiKey: string | null;
};
