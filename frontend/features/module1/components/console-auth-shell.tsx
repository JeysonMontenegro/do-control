"use client";

import type { ComponentProps, ReactNode } from "react";

import { ConsoleOverviewStrip } from "@/features/module1/components/console-overview-strip";
import { ConsoleSidebar } from "@/features/module1/components/console-sidebar";
import { ConsoleTopbar } from "@/features/module1/components/console-topbar";

type ConsoleAuthShellProps = {
  loading: boolean;
  mainContent: ReactNode;
  message: string;
  messageTone: string;
  modalContent: ReactNode;
  overviewStripProps: ComponentProps<typeof ConsoleOverviewStrip> | null;
  sidebarProps: ComponentProps<typeof ConsoleSidebar>;
  topbarProps: ComponentProps<typeof ConsoleTopbar>;
};

export function ConsoleAuthShell({
  loading,
  mainContent,
  message,
  messageTone,
  modalContent,
  overviewStripProps,
  sidebarProps,
  topbarProps,
}: ConsoleAuthShellProps) {
  return (
    <section className="app-shell-auth">
      <ConsoleSidebar {...sidebarProps} />

      <div className="app-content">
        <ConsoleTopbar {...topbarProps} />

        {message ? <p className={`message-box message-box-${messageTone}`}>{message}</p> : null}
        {loading ? <p className="message-box message-box-info">Cargando información clínica...</p> : null}
        {!loading && overviewStripProps ? <ConsoleOverviewStrip {...overviewStripProps} /> : null}

        {mainContent}
      </div>

      {modalContent}
    </section>
  );
}
