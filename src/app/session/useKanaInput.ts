import { useCallback, useState } from "react";
import { toKana, toKatakana } from "wanakana";

export type KanaKeyboardMode = "auto" | "hiragana" | "katakana";
export type KanaScript = "hiragana" | "katakana";

export interface UseKanaInputOptions {
  keyboardMode?: KanaKeyboardMode;
  autoScript?: KanaScript;
}

export interface KanaInputState {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

export function useKanaInput(
  initialValue = "",
  options?: UseKanaInputOptions,
): KanaInputState {
  const [value, setValue] = useState(initialValue);
  const keyboardMode = options?.keyboardMode ?? "auto";
  const autoScript = options?.autoScript ?? "hiragana";

  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const resolvedMode = keyboardMode === "auto" ? autoScript : keyboardMode;
      const converted =
        resolvedMode === "katakana"
          ? toKatakana(event.target.value, { IMEMode: true })
          : toKana(event.target.value, { IMEMode: true });
      setValue(converted);
    },
    [autoScript, keyboardMode],
  );

  const reset = useCallback(() => setValue(""), []);

  return { value, onChange, reset };
}
