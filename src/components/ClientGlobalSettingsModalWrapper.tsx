"use client";

import dynamic from "next/dynamic";

const DynamicGlobalSettingsModalWrapper = dynamic(() => import("@/components/GlobalSettingsModalWrapper"), { ssr: false });

export default function ClientGlobalSettingsModalWrapper() {
  return <DynamicGlobalSettingsModalWrapper />;
}
