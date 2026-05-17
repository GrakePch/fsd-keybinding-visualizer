import { describe, expect, it } from "vitest";
import type { CameraPositionMarker } from "./cameraViewport";
import { canEnterCameraView, getCameraViewMarker, getCameraViewSlotIdFromSearchParams, setCameraViewSlotIdInSearchParams } from "./cameraView";

const markers: CameraPositionMarker[] = [
  {
    slotId: 1,
    label: "2",
    targetPosition: [10, 20, 30],
    cameraPosition: [10, 15, 30],
    fStop: 11,
  },
];

describe("camera view state helpers", () => {
  it("enables camera view only when the selected slot has a marker", () => {
    expect(canEnterCameraView(markers, 1)).toBe(true);
    expect(canEnterCameraView(markers, 0)).toBe(false);
    expect(canEnterCameraView([], 1)).toBe(false);
  });

  it("uses the selected camera marker only while camera view is active", () => {
    expect(getCameraViewMarker({ isCameraViewActive: false, markers, selectedSlotId: 1 })).toBeNull();
    expect(getCameraViewMarker({ isCameraViewActive: true, markers, selectedSlotId: 1 })).toEqual(markers[0]);
    expect(getCameraViewMarker({ isCameraViewActive: true, markers, selectedSlotId: 0 })).toBeNull();
  });

  it("parses camera view query as a one-based slot number", () => {
    expect(getCameraViewSlotIdFromSearchParams(new URLSearchParams("view=1"))).toBe(0);
    expect(getCameraViewSlotIdFromSearchParams(new URLSearchParams("view=9"))).toBe(8);
    expect(getCameraViewSlotIdFromSearchParams(new URLSearchParams("view=0"))).toBeNull();
    expect(getCameraViewSlotIdFromSearchParams(new URLSearchParams("view=10"))).toBeNull();
    expect(getCameraViewSlotIdFromSearchParams(new URLSearchParams("view=foo"))).toBeNull();
  });

  it("writes and removes camera view query without dropping other query values", () => {
    const entered = setCameraViewSlotIdInSearchParams(new URLSearchParams("model=foo"), 1);
    expect(entered.toString()).toBe("model=foo&view=2");

    const exited = setCameraViewSlotIdInSearchParams(entered, null);
    expect(exited.toString()).toBe("model=foo");
  });
});
