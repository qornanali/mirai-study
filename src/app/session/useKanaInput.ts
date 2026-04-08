import { useCallback, useState } from "react";
import { toKana } from "wanakana";

export interface KanaInputState {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  reset: () => void;
}

export function useKanaInput(initialValue = ""): KanaInputState {
  const [value, setValue] = useState(initialValue);

  const onChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const converted = toKana(event.target.value, { IMEMode: true });
    setValue(converted);
  }, []);

  const reset = useCallback(() => setValue(""), []);

  return { value, onChange, reset };
}
