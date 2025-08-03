"use client";

import dynamic from "next/dynamic";

const DynamicPomodoroClient = dynamic(() => import("./PomodoroClient"), { ssr: false });

export default function Home() {
  return <DynamicPomodoroClient />;
}
