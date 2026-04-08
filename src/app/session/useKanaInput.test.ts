import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useKanaInput } from "./useKanaInput";

describe("useKanaInput", () => {
  it("starts with an empty value", () => {
    const { result } = renderHook(() => useKanaInput());

    expect(result.current.value).toBe("");
  });

  it("converts romaji input to hiragana live", () => {
    const { result } = renderHook(() => useKanaInput());

    act(() => {
      result.current.onChange({
        target: { value: "neko" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("ねこ");
  });

  it("passes through direct kana input unchanged", () => {
    const { result } = renderHook(() => useKanaInput());

    act(() => {
      result.current.onChange({
        target: { value: "ねこ" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("ねこ");
  });

  it("resets value to empty string", () => {
    const { result } = renderHook(() => useKanaInput());

    act(() => {
      result.current.onChange({
        target: { value: "neko" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("ねこ");

    act(() => {
      result.current.reset();
    });

    expect(result.current.value).toBe("");
  });

  it("holds mid-syllable input until completed", () => {
    const { result } = renderHook(() => useKanaInput());

    act(() => {
      result.current.onChange({
        target: { value: "n" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("n");

    act(() => {
      result.current.onChange({
        target: { value: "ne" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("ね");
  });

  it("converts romaji to katakana in katakana mode", () => {
    const { result } = renderHook(() =>
      useKanaInput("", { keyboardMode: "katakana", autoScript: "hiragana" }),
    );

    act(() => {
      result.current.onChange({
        target: { value: "neko" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("ネコ");
  });

  it("uses autoScript when keyboard mode is auto", () => {
    const initialProps: { autoScript: "hiragana" | "katakana" } = {
      autoScript: "katakana",
    };

    const { result, rerender } = renderHook(
      ({ autoScript }: { autoScript: "hiragana" | "katakana" }) =>
        useKanaInput("", { keyboardMode: "auto", autoScript }),
      { initialProps },
    );

    act(() => {
      result.current.onChange({
        target: { value: "kohi" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("コヒ");

    act(() => {
      result.current.reset();
    });

    rerender({ autoScript: "hiragana" });

    act(() => {
      result.current.onChange({
        target: { value: "kohi" },
      } as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.value).toBe("こひ");
  });
});
