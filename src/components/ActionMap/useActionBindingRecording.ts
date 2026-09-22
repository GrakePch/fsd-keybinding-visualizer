import { useCallback, useEffect, useRef, useState } from "react";
import type { BindingDevice, InputBinding } from "../../interfaces";
import { codesNonBindable, keyCodeToCigInput } from "../../utils/keyCodes";
import { modifiers, updateInputBinding } from "../../utils/utils";

const RECORDING_DURATION_MS = 3000;

const mouseButtonToCigInput: Record<number, string> = {
  0: "mouse1",
  2: "mouse2",
  1: "mouse3",
  3: "mouse4",
  4: "mouse5",
  5: "mouse6",
  6: "mouse7",
};

export type RecordingState = {
  binding: InputBinding;
  captured: boolean;
  id: number;
  targetIndex: number;
};

type UseActionBindingRecordingOptions = {
  currentBinding: InputBinding;
  targetIndex: number;
  onCommit: (binding: InputBinding, targetIndex: number) => void;
};

const getLastPressedModifier = (pressedModifiers: Set<string>) => {
  let lastModifier = "";
  pressedModifiers.forEach((modifier) => {
    lastModifier = modifier;
  });
  return lastModifier;
};

export const useActionBindingRecording = ({
  currentBinding,
  targetIndex,
  onCommit,
}: UseActionBindingRecordingOptions) => {
  const [recording, setRecording] = useState<RecordingState | null>(null);
  const recordingRef = useRef<RecordingState | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingIdRef = useRef(0);
  const pressedModifiersRef = useRef(new Set<string>());
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  const setRecordingState = useCallback((nextRecording: RecordingState | null) => {
    recordingRef.current = nextRecording;
    setRecording(nextRecording);
  }, []);

  const cancelRecording = useCallback(() => {
    if (recordingTimerRef.current !== null) {
      window.clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    pressedModifiersRef.current.clear();
    setRecordingState(null);
  }, [setRecordingState]);

  const updateRecordingBinding = useCallback((input: string, device: BindingDevice, modifier = "") => {
    setRecording((currentRecording) => {
      if (!currentRecording) return currentRecording;
      const baseBinding = {
        ...currentRecording.binding,
        device,
        serializationPrefix:
          device === "mouse" || device === "keyboard" ? "kb1" : currentRecording.binding.serializationPrefix,
      };
      const nextBinding = updateInputBinding(baseBinding, input, modifier);
      const nextRecording = { ...currentRecording, binding: nextBinding, captured: true };
      recordingRef.current = nextRecording;
      return nextRecording;
    });
  }, []);

  useEffect(() => {
    if (!recording) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();
      if (event.code === "Escape") {
        cancelRecording();
        return;
      }
      if (event.repeat || codesNonBindable.has(event.code)) return;
      const input = keyCodeToCigInput[event.code];
      if (!input) return;
      if (modifiers.includes(input)) pressedModifiersRef.current.add(input);
      if (modifiers.includes(input) && recording.binding.inputName && !modifiers.includes(recording.binding.inputName)) {
        updateRecordingBinding(recording.binding.inputName, "keyboard", input);
      } else if (!modifiers.includes(input)) {
        updateRecordingBinding(input, "keyboard", getLastPressedModifier(pressedModifiersRef.current));
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      const input = keyCodeToCigInput[event.code];
      if (input && modifiers.includes(input)) pressedModifiersRef.current.delete(input);
    };

    const handleMouseDown = (event: MouseEvent) => {
      const input = mouseButtonToCigInput[event.button];
      if (!input) return;
      event.preventDefault();
      event.stopPropagation();
      const modifier = event.ctrlKey ? "lctrl" : event.altKey ? "lalt" : event.shiftKey ? "lshift" : "";
      updateRecordingBinding(input, "mouse", modifier);
    };

    const handleWheel = (event: WheelEvent) => {
      if (event.deltaY === 0) return;
      event.preventDefault();
      event.stopPropagation();
      const modifier = event.ctrlKey ? "lctrl" : event.altKey ? "lalt" : event.shiftKey ? "lshift" : "";
      updateRecordingBinding(event.deltaY < 0 ? "mwheel_up" : "mwheel_down", "mouse", modifier);
    };

    const handleContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, { capture: true });
    window.addEventListener("keyup", handleKeyUp, { capture: true });
    window.addEventListener("mousedown", handleMouseDown, { capture: true });
    window.addEventListener("wheel", handleWheel, { capture: true, passive: false });
    window.addEventListener("contextmenu", handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
      window.removeEventListener("keyup", handleKeyUp, { capture: true });
      window.removeEventListener("mousedown", handleMouseDown, { capture: true });
      window.removeEventListener("wheel", handleWheel, { capture: true });
      window.removeEventListener("contextmenu", handleContextMenu, { capture: true });
    };
  }, [cancelRecording, recording, updateRecordingBinding]);

  useEffect(
    () => () => {
      if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    },
    []
  );

  const startRecording = useCallback(() => {
    if (recordingTimerRef.current !== null) window.clearTimeout(recordingTimerRef.current);
    pressedModifiersRef.current.clear();
    const nextRecording = {
      binding: currentBinding,
      captured: false,
      id: recordingIdRef.current + 1,
      targetIndex,
    };
    recordingIdRef.current = nextRecording.id;
    setRecordingState(nextRecording);
    recordingTimerRef.current = window.setTimeout(() => {
      const recordedBinding = recordingRef.current;
      if (recordedBinding?.id === nextRecording.id && recordedBinding.captured) {
        onCommitRef.current(recordedBinding.binding, recordedBinding.targetIndex);
      }
      pressedModifiersRef.current.clear();
      setRecordingState(null);
      recordingTimerRef.current = null;
    }, RECORDING_DURATION_MS);
  }, [currentBinding, setRecordingState, targetIndex]);

  return { recording, startRecording };
};
