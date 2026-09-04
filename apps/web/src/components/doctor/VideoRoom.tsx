import { useEffect, useRef, useCallback } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

interface VideoRoomProps {
  roomId: string;
  userName: string;
  onLeave?: () => void;
}

export function VideoRoom({ roomId, userName, onLeave }: VideoRoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const zpRef = useRef<ReturnType<typeof ZegoUIKitPrebuilt.create> | null>(null);
  const joinedRef = useRef(false);

  // Stable callback ref to avoid re-running effect on onLeave change
  const onLeaveRef = useRef(onLeave);
  onLeaveRef.current = onLeave;

  const initRoom = useCallback(async () => {
    // Prevent double-init from React StrictMode
    if (joinedRef.current || zpRef.current) return;

    const appID = Number(import.meta.env.VITE_ZEGOCLOUD_APP_ID);
    const serverSecret = import.meta.env.VITE_ZEGOCLOUD_SERVER_SECRET as string;

    if (!appID || !serverSecret) {
      console.error("Missing VITE_ZEGOCLOUD_APP_ID or VITE_ZEGOCLOUD_SERVER_SECRET");
      return;
    }

    const userID = `${userName.replace(/\s+/g, "_")}_${Date.now()}`;
    const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
      appID,
      serverSecret,
      roomId,
      userID,
      userName
    );

    const zp = ZegoUIKitPrebuilt.create(kitToken);
    zpRef.current = zp;
    joinedRef.current = true;

    zp.joinRoom({
      container: containerRef.current!,
      scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
      showPreJoinView: false,
      turnOnCameraWhenJoining: true,
      turnOnMicrophoneWhenJoining: true,
      onLeaveRoom: () => {
        onLeaveRef.current?.();
      },
    });
  }, [roomId, userName]);

  useEffect(() => {
    initRoom();

    return () => {
      if (zpRef.current) {
        zpRef.current.destroy();
        zpRef.current = null;
        joinedRef.current = false;
      }
    };
  }, [initRoom]);

  return <div ref={containerRef} className="h-full w-full overflow-hidden" style={{ maxHeight: "100%" }} />;
}
