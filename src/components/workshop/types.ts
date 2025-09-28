export type StepController = {
  submit: () => void;
  canSubmit: () => boolean;
  canAskHint?: () => boolean;
  askHint?: () => void;
};
